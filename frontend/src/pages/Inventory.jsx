import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { Tabs, Button, Empty } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import map from 'lodash/map';
import { getProfileStorage, sellItemByStorageId } from '../api/all/storage';
import { getItemPriceById } from '../api/all/item';
import { itemInfoFetch } from '../store/actions/itemCache';
import { computeItemPriceUAH } from '../helpers/price';
import ItemColor from '../components/mini/ItemColor';
import openNotification from '../components/mini/openNotification';
import Loader from '../components/mini/Loader';

const { TabPane } = Tabs;

const mapStateToProps = (state) => ({
    itemCache: state.itemCache,
    modules: state.modules,
});

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
});

const Inventory = ({
    itemCache, modules, itemInfoFetch: fetchItem, t,
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
                getProfileStorage({ status: 'inventory', limit: 200 }),
                getProfileStorage({ status: 'money', limit: 200 }),
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
                if (window.HeaderSecond) {
                    window.HeaderSecond.changeBalance(res.balance);
                }
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

    const onSellAll = async () => {
        if (selling) {
            return;
        }
        setSelling(true);
        const rows = [...active];
        for (let i = 0; i < rows.length; i++) {
            try {
                // eslint-disable-next-line no-await-in-loop
                const res = await sellItemByStorageId(rows[i].storage_id);
                if (res.status === 200 && window.HeaderSecond) {
                    window.HeaderSecond.changeBalance(res.balance);
                }
            } catch (e) {
                // continue selling the rest
            }
        }
        setSelling(false);
        openNotification('success', t('openCase.allSold'));
        await load();
    };

    const card = (row, sellable) => (
        <div key={row.storage_id} className="inventorypage-card">
            <div
                className="inventorypage-card__img"
                style={{ backgroundImage: `url(/img/items/${row.storage_itemId}.webp)` }}
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
