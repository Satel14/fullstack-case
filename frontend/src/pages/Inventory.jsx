import React, { useEffect, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { Tabs, Button, Empty } from 'antd';
import { DollarOutlined, ExportOutlined, RollbackOutlined } from '@ant-design/icons';
import map from 'lodash/map';
import {
    getProfileStorage, sellItemByStorageId, receiveItemByStorageId, cancelWithdrawalByStorageId,
} from '../api/all/storage';
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
const WITHDRAW_COMPLETES_MS = 70 * 1000;
const WITHDRAW_POLL_MS = 10 * 1000;
const SHOWN_REASONS = [403, 422, 429];

const mapStateToProps = (state) => ({
    itemCache: state.itemCache,
    modules: state.modules,
    receiveInfo: state.user.receiveInfo,
});

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
    updateBalance: (balance) => dispatch(updateBalance(balance)),
});

const Inventory = ({
    itemCache, modules, receiveInfo, history, itemInfoFetch: fetchItem, updateBalance: setBalance, t,
}) => {
    const [active, setActive] = useState([]);
    const [sold, setSold] = useState([]);
    const [pending, setPending] = useState([]);
    const [withdrawn, setWithdrawn] = useState([]);
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [selling, setSelling] = useState(false);
    const [now, setNow] = useState(Date.now());
    const busy = useRef(false);
    const [acting, setActing] = useState(false);
    const epoch = useRef(0);
    const clockOffset = useRef(0);

    const syncClock = (serverNow) => {
        const server = Date.parse(serverNow);
        if (!Number.isNaN(server)) {
            clockOffset.current = server - Date.now();
        }
    };

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

    const loadWithdrawals = async () => {
        const generation = epoch.current;
        const [waiting, done] = await Promise.all([
            getProfileStorage({ status: 'waitingtrade', limit: PAGE_LIMIT }),
            getProfileStorage({ status: 'received', limit: PAGE_LIMIT }),
        ]);
        syncClock(waiting.serverNow);
        const waitingRows = waiting.data || [];
        const doneRows = done.data || [];
        if (generation !== epoch.current) {
            return;
        }
        cacheItems([...waitingRows, ...doneRows]);
        setNow(Date.now());
        setPending(waitingRows);
        setWithdrawn(doneRows);
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
            await loadWithdrawals();
        } catch (e) {
            openNotification('error', t('common.error'), t('common.serverError'));
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => () => { epoch.current += 1; }, []);

    useEffect(() => {
        if (!pending.length) {
            return undefined;
        }
        const poll = setInterval(() => { loadWithdrawals().catch(() => {}); }, WITHDRAW_POLL_MS);
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => {
            clearInterval(poll);
            clearInterval(tick);
        };
    }, [pending.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
        let offset = 0;
        let left = new Map();
        for (;;) {
            let rows;
            try {
                // eslint-disable-next-line no-await-in-loop
                const page = await getProfileStorage({ status: 'inventory', limit: PAGE_LIMIT, offset });
                rows = page.data || [];
            } catch (e) {
                return { failure: true, total };
            }
            const fresh = rows.filter((r) => !attempted.has(r.storage_id));
            if (fresh.length) {
                // eslint-disable-next-line no-await-in-loop
                const { failure, soldCount } = await sellRows(fresh, attempted, refused);
                total += soldCount;
                if (failure) {
                    return { failure, total };
                }
                offset = 0;
                left = new Map();
            } else {
                rows.forEach((r) => left.set(r.storage_id, r));
                if (rows.length === PAGE_LIMIT) {
                    offset += PAGE_LIMIT;
                } else {
                    const stuck = [...left.keys()].some((id) => !refused.has(id));
                    return { failure: stuck || null, total, refused: left.size };
                }
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

    const failureReason = (e) => (e && SHOWN_REASONS.includes(e.error) && e.message) || t('common.serverError');

    const onWithdraw = async (item) => {
        if (busy.current) {
            return;
        }
        if (!receiveInfo || !String(receiveInfo).trim()) {
            const openSettings = (e) => {
                if (history) {
                    e.preventDefault();
                    history.push('/settings');
                }
            };
            openNotification('error', t('inventory.withdrawErrorTitle'), (
                <a href="/settings" onClick={openSettings}>{t('inventory.withdrawNeedsInfo')}</a>
            ));
            return;
        }
        busy.current = true;
        setActing(true);
        try {
            const res = await receiveItemByStorageId(item.storage_id);
            epoch.current += 1;
            syncClock(res.serverNow);
            openNotification('success', t('inventory.withdrawRequested'));
            setActive((prev) => prev.filter((x) => x.storage_id !== item.storage_id));
            setNow(Date.now());
            setPending((prev) => [
                { ...item, storage_status: 'waitingtrade', completesAt: res.completesAt },
                ...prev.filter((x) => x.storage_id !== item.storage_id),
            ]);
        } catch (e) {
            openNotification('error', t('inventory.withdrawErrorTitle'), failureReason(e));
        }
        busy.current = false;
        setActing(false);
    };

    const onCancelWithdraw = async (item) => {
        if (busy.current) {
            return;
        }
        busy.current = true;
        setActing(true);
        try {
            await cancelWithdrawalByStorageId(item.storage_id);
            epoch.current += 1;
            openNotification('success', t('inventory.withdrawCancelled'));
            setPending((prev) => prev.filter((x) => x.storage_id !== item.storage_id));
            setActive((prev) => [{ ...item, storage_status: 'inventory' }, ...prev]);
        } catch (e) {
            openNotification('error', t('inventory.withdrawErrorTitle'), failureReason(e));
            await loadWithdrawals().catch(() => {});
        }
        busy.current = false;
        setActing(false);
    };

    const secondsLeft = (item) => {
        const completes = item.completesAt
            ? Date.parse(item.completesAt)
            : Date.parse(item.updated_at) + WITHDRAW_COMPLETES_MS;
        return Math.max(0, Math.ceil((completes - (now + clockOffset.current)) / 1000));
    };

    const card = (row, actions) => (
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
            {actions}
        </div>
    );

    const activeActions = (row) => (
        <>
            <Button
                type="primary"
                icon={<DollarOutlined />}
                ghost
                size="small"
                disabled={selling || acting}
                onClick={() => onSell(row)}
            >
                {prices[row.storage_id]
                    ? t('openCase.sellFor', { price: prices[row.storage_id] })
                    : t('inventory.sell')}
            </Button>
            <Button icon={<ExportOutlined />} size="small" disabled={selling || acting} onClick={() => onWithdraw(row)}>
                {t('inventory.withdraw')}
            </Button>
        </>
    );

    const pendingActions = (row) => (
        <>
            <span className="inventorypage-card__meta">
                {secondsLeft(row) > 0
                    ? t('inventory.withdrawCountdown', { seconds: secondsLeft(row) })
                    : t('inventory.withdrawCompleting')}
            </span>
            <Button icon={<RollbackOutlined />} size="small" disabled={selling || acting} onClick={() => onCancelWithdraw(row)}>
                {t('inventory.withdrawCancel')}
            </Button>
        </>
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
                                <Button type="primary" icon={<DollarOutlined />} disabled={selling || acting} onClick={onSellAll}>
                                    {t('inventory.sellAll')}
                                </Button>
                            </div>
                            <div className="inventorypage-grid">{map(active, (r) => card(r, activeActions(r)))}</div>
                        </>
                    ) : (
                        <Empty description={t('inventory.emptyActive')} />
                    )}
                </TabPane>
                <TabPane tab={t('inventory.sold')} key="sold">
                    {sold.length ? (
                        <div className="inventorypage-grid">{map(sold, (r) => card(r, null))}</div>
                    ) : (
                        <Empty description={t('inventory.emptySold')} />
                    )}
                </TabPane>
                <TabPane tab={t('inventory.withdrawTab')} key="withdraw">
                    {pending.length || withdrawn.length ? (
                        <>
                            {pending.length > 0 && (
                                <>
                                    <h3>{t('inventory.withdrawPending')}</h3>
                                    <div className="inventorypage-grid">
                                        {map(pending, (r) => card(r, pendingActions(r)))}
                                    </div>
                                </>
                            )}
                            {withdrawn.length > 0 && (
                                <>
                                    <h3>{t('inventory.withdrawDone')}</h3>
                                    <div className="inventorypage-grid">{map(withdrawn, (r) => card(r, null))}</div>
                                </>
                            )}
                        </>
                    ) : (
                        <Empty description={t('inventory.withdrawEmpty')} />
                    )}
                </TabPane>
            </Tabs>
        </div>
    );
};

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(Inventory));
