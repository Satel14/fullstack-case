import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { Tabs, Button, Empty } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import map from 'lodash/map';
import { getProfileStorage, sellItemByStorageId } from '../api/all/storage';
import { getItemPriceById } from '../api/all/item';
import { itemInfoFetch } from '../store/actions/itemCache';
import { updateBalance } from '../store/actions/user';
import { computeItemPriceUAH } from '../helpers/price';
import ItemColor from '../components/mini/ItemColor';
import openNotification from '../components/mini/openNotification';
import Loader from '../components/mini/Loader';

const { TabPane } = Tabs;

const PAGE_LIMIT = 200;
const TOO_MANY_REQUESTS = 429;
const UNSELLABLE = 422;

const mapStateToProps = (state) => ({
    itemCache: state.itemCache,
    modules: state.modules,
});

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
    updateBalance: (balance) => dispatch(updateBalance(balance)),
});

const Inventory = ({
    itemCache, modules, itemInfoFetch: fetchItem, updateBalance: setBalance, t,
}) => {
    const [active, setActive] = useState([]);
    const [sold, setSold] = useState([]);
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [selling, setSelling] = useState(false);

    const rate = (modules && modules['uah-credit-rate']) ? modules['uah-credit-rate'].extraData : 1;

    const cacheItems = (rows) => {
        rows.forEach((r) => {
            if (!itemCache[r.storage_itemId]) {
                fetchItem(r.storage_itemId);
            }
        });
    };

    const loadPrices = async (rows) => {
        const entries = await Promise.all(rows.map(async (r) => {
            try {
                const res = await getItemPriceById(r.storage_itemId);
                const p = typeof res.prices === 'string' ? JSON.parse(res.prices) : res.prices;
                return [r.storage_id, computeItemPriceUAH(p, r.storage_color, rate)];
            } catch (e) {
                return [r.storage_id, null];
            }
        }));
        setPrices((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    };

    const load = async () => {
        setLoading(true);
        try {
            const [inv, money] = await Promise.all([
                getProfileStorage({ status: 'inventory', limit: PAGE_LIMIT }),
                getProfileStorage({ status: 'money', limit: PAGE_LIMIT }),
            ]);
            const invRows = inv.data || [];
            const moneyRows = money.data || [];
            cacheItems([...invRows, ...moneyRows]);
            setActive(invRows);
            setSold(moneyRows);
            await loadPrices(invRows);
        } catch (e) {
            openNotification('error', t('common.error'), t('common.serverError'));
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const info = (id, field) => (itemCache[id] ? itemCache[id][field] : '');

    const onSell = async (row) => {
        if (selling) {
            return;
        }
        setSelling(true);
        try {
            const res = await sellItemByStorageId(row.storage_id);
            if (res.status === 200) {
                setBalance(res.balance);
                openNotification('success', t('openCase.sold'));
                setActive((prev) => prev.filter((x) => x.storage_id !== row.storage_id));
                setSold((prev) => [row, ...prev]);
            } else {
                openNotification('error', t('openCase.sellErrorTitle'), res.message || t('openCase.sellErrorText'));
            }
        } catch (e) {
            openNotification('error', t('common.error'), t('openCase.sellErrorText'));
        }
        setSelling(false);
    };

    const sellRows = async (rows, attempted, refused) => {
        let soldCount = 0;
        for (let i = 0; i < rows.length; i++) {
            attempted.add(rows[i].storage_id);
            try {
                // eslint-disable-next-line no-await-in-loop
                const res = await sellItemByStorageId(rows[i].storage_id);
                if (res.status === UNSELLABLE) {
                    refused.add(rows[i].storage_id);
                } else if (res.status !== 200) {
                    return { failure: res.status || true, soldCount };
                } else {
                    setBalance(res.balance);
                    soldCount += 1;
                }
            } catch (e) {
                if (!e || e.error !== UNSELLABLE) {
                    return { failure: (e && e.error) || true, soldCount };
                }
                refused.add(rows[i].storage_id);
            }
        }
        return { failure: null, soldCount };
    };

    const sellEverything = async () => {
        const attempted = new Set();
        const refused = new Set();
        let total = 0;
        for (;;) {
            let rows;
            try {
                // eslint-disable-next-line no-await-in-loop
                const page = await getProfileStorage({ status: 'inventory', limit: PAGE_LIMIT });
                rows = page.data || [];
            } catch (e) {
                return { failure: true, total, refused: refused.size };
            }
            const fresh = rows.filter((r) => !attempted.has(r.storage_id));
            if (!fresh.length) {
                const stuck = rows.some((r) => !refused.has(r.storage_id));
                return { failure: stuck || null, total, refused: refused.size };
            }
            // eslint-disable-next-line no-await-in-loop
            const { failure, soldCount } = await sellRows(fresh, attempted, refused);
            total += soldCount;
            if (failure) {
                return { failure, total, refused: refused.size };
            }
        }
    };

    const onSellAll = async () => {
        if (selling) {
            return;
        }
        setSelling(true);
        const { failure, total, refused } = await sellEverything();
        setSelling(false);
        if (failure === TOO_MANY_REQUESTS) {
            openNotification('error', t('openCase.sellErrorTitle'), t('inventory.sellAllRateLimited', { sold: total }));
        } else if (failure) {
            openNotification('error', t('openCase.sellErrorTitle'), t('inventory.sellAllStopped', { sold: total }));
        } else if (refused) {
            openNotification('error', t('openCase.sellErrorTitle'), t('inventory.sellAllSkipped', { sold: total, skipped: refused }));
        } else {
            openNotification('success', t('openCase.allSold'));
        }
        await load();
    };

    const card = (row, sellable) => (
        <div key={row.storage_id} className="inventorypage-card">
            <div
                className="inventorypage-card__img"
                style={{ backgroundImage: info(row.storage_itemId, 'item_imagePath') ? `url(${encodeURI(info(row.storage_itemId, 'item_imagePath'))})` : 'none' }}
            >
                <ItemColor color={row.storage_color} />
            </div>
            <div className="inventorypage-card__name">{info(row.storage_itemId, 'item_name')}</div>
            <span className="inventorypage-card__meta">
                {info(row.storage_itemId, 'item_rare')} {info(row.storage_itemId, 'item_type')}
            </span>
            {sellable && (
                <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    ghost
                    size="small"
                    disabled={selling}
                    onClick={() => onSell(row)}
                >
                    {prices[row.storage_id]
                        ? t('openCase.sellFor', { price: prices[row.storage_id] })
                        : t('inventory.sell')}
                </Button>
            )}
        </div>
    );

    if (loading) {
        return <Loader />;
    }

    return (
        <div className="inventorypage">
            <h2>{t('inventory.title')}</h2>
            <Tabs>
                <TabPane tab={t('inventory.active')} key="active">
                    {active.length ? (
                        <>
                            <div className="inventorypage-actions">
                                <Button type="primary" icon={<DollarOutlined />} disabled={selling} onClick={onSellAll}>
                                    {t('inventory.sellAll')}
                                </Button>
                            </div>
                            <div className="inventorypage-grid">{map(active, (r) => card(r, true))}</div>
                        </>
                    ) : (
                        <Empty description={t('inventory.emptyActive')} />
                    )}
                </TabPane>
                <TabPane tab={t('inventory.sold')} key="sold">
                    {sold.length ? (
                        <div className="inventorypage-grid">{map(sold, (r) => card(r, false))}</div>
                    ) : (
                        <Empty description={t('inventory.emptySold')} />
                    )}
                </TabPane>
            </Tabs>
        </div>
    );
};

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(Inventory));
