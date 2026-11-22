import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { Button } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { getProfileStorage } from '../api/all/storage';
import { postUpgrade } from '../api/all/upgrade';
import { itemInfoFetch } from '../store/actions/itemCache';
import { isAuthorized } from '../helpers/Player';
import { clientErrorMessage } from '../helpers/serverMessage';
import useMediaQuery from '../helpers/useMediaQuery';
import { siteLanguage } from '../i18n/language';
import {
    MAX_STAKE_ITEMS, thresholdAllowed, toKop, upgradeThreshold,
} from '../helpers/upgrade';
import StakePicker from '../components/upgrade/StakePicker';
import TargetPicker from '../components/upgrade/TargetPicker';
import UpgradeRing from '../components/upgrade/UpgradeRing';

const INVENTORY_LIMIT = 200;
const ROLL_DURATION = 4000;

const UpgradePlayer = () => {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const itemCache = useSelector((state) => state.itemCache);
    const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const [inventory, setInventory] = useState([]);
    const [inventoryLoading, setInventoryLoading] = useState(true);
    const [inventoryFailure, setInventoryFailure] = useState(null);
    const [inventoryMore, setInventoryMore] = useState(false);
    const [inventoryOffset, setInventoryOffset] = useState(0);
    const [inventoryAttemptOffset, setInventoryAttemptOffset] = useState(0);
    const inventoryRequest = useRef(0);
    const mounted = useRef(true);
    const busy = useRef(false);
    const [selected, setSelected] = useState([]);
    const [target, setTarget] = useState(null);
    const [serverQuote, setServerQuote] = useState(null);
    const [targetRefresh, setTargetRefresh] = useState(0);
    const [failure, setFailure] = useState(null);
    const [limitReached, setLimitReached] = useState(false);
    const [phase, setPhase] = useState('idle');
    const [draw, setDraw] = useState(null);
    const [result, setResult] = useState(null);

    const loadInventory = useCallback(async (offset = 0) => {
        inventoryRequest.current += 1;
        const attempt = inventoryRequest.current;
        setInventoryLoading(true);
        setInventoryFailure(null);
        setInventoryAttemptOffset(offset);
        try {
            const answer = await getProfileStorage({ status: 'inventory', limit: INVENTORY_LIMIT, offset });
            const rows = answer.data || [];
            if (attempt !== inventoryRequest.current) {
                return;
            }
            await Promise.all(rows.map((row) => dispatch(itemInfoFetch(row.storage_itemId))));
            if (attempt === inventoryRequest.current) {
                setInventory((previous) => (offset === 0 ? rows : [...new Map([...previous, ...rows].map((row) => [row.storage_id, row])).values()]));
                setInventoryOffset(offset + rows.length);
                setInventoryMore(rows.length === INVENTORY_LIMIT);
            }
        } catch (error) {
            if (attempt === inventoryRequest.current) {
                setInventoryFailure(error);
            }
        } finally {
            if (attempt === inventoryRequest.current) {
                setInventoryLoading(false);
            }
        }
    }, [dispatch]);

    useEffect(() => {
        mounted.current = true;
        loadInventory();
        return () => {
            mounted.current = false;
            inventoryRequest.current += 1;
        };
    }, [loadInventory]);

    useEffect(() => {
        if (phase !== 'rolling' || !draw) {
            return undefined;
        }
        const finish = () => {
            busy.current = false;
            setResult(draw);
            setSelected([]);
            setTarget(null);
            setServerQuote(null);
            setInventory([]);
            setInventoryOffset(0);
            setPhase('idle');
            loadInventory();
        };
        if (reducedMotion) {
            finish();
            return undefined;
        }
        const timer = setTimeout(finish, ROLL_DURATION);
        return () => clearTimeout(timer);
    }, [phase, draw, reducedMotion, loadInventory]);

    const rows = inventory.map((row) => ({
        ...row,
        item: itemCache[row.storage_itemId],
        priceKop: toKop(itemCache[row.storage_itemId]?.pricesInCredits?.[row.storage_color]),
    }));
    const chosen = rows.filter((row) => selected.includes(row.storage_id));
    const stakeKop = chosen.reduce((sum, row) => sum + row.priceKop, 0);
    const targetKop = toKop(target?.price);
    const threshold = serverQuote?.threshold ?? upgradeThreshold(stakeKop, targetKop);
    const locked = phase !== 'idle';
    const canUpgrade = !locked && !inventoryLoading && !inventoryFailure
        && selected.length > 0 && selected.length <= MAX_STAKE_ITEMS && chosen.length === selected.length
        && chosen.every((row) => row.priceKop > 0) && targetKop > 0 && thresholdAllowed(threshold);
    const formatPrice = (kop) => t('upgrade.price', {
        value: new Intl.NumberFormat(siteLanguage(i18n.language), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(kop / 100),
    });

    const clearOutcome = () => {
        setFailure(null);
        setLimitReached(false);
        setServerQuote(null);
        setResult(null);
        setDraw(null);
    };

    const toggleStake = (row) => {
        if (busy.current || inventoryLoading) {
            return;
        }
        const wasSelected = selected.includes(row.storage_id);
        if (!wasSelected && selected.length >= MAX_STAKE_ITEMS) {
            setLimitReached(true);
            return;
        }
        if (!wasSelected && !row.priceKop) {
            return;
        }
        clearOutcome();
        setSelected(wasSelected ? selected.filter((id) => id !== row.storage_id) : [...selected, row.storage_id]);
        setTarget(null);
    };

    const chooseTarget = (item) => {
        if (busy.current) {
            return;
        }
        clearOutcome();
        setTarget(item);
    };

    const upgrade = async () => {
        if (busy.current || !canUpgrade) {
            return;
        }
        busy.current = true;
        setPhase('requesting');
        setFailure(null);
        setLimitReached(false);
        setResult(null);
        setDraw(null);
        try {
            const answer = await postUpgrade({
                storageIds: selected, targetItemId: target.itemId, targetColor: target.color, expectedThreshold: threshold,
            });
            if (!mounted.current) {
                return;
            }
            setDraw({ ...answer.data, target });
            if (answer.data.item) {
                dispatch(itemInfoFetch(answer.data.item.storage_itemId));
            }
            setPhase('rolling');
        } catch (error) {
            if (!mounted.current) {
                return;
            }
            if (error?.error === 409) {
                if (Number.isInteger(error.threshold)) {
                    setServerQuote({ threshold: error.threshold, stakeValue: error.stakeValue, targetPrice: error.targetPrice });
                }
                setTargetRefresh((value) => value + 1);
            } else if (error?.error === 422 && ['UPGRADE.CHANCE_TOO_HIGH', 'UPGRADE.CHANCE_TOO_LOW'].includes(error.code)) {
                setTarget(null);
                setServerQuote(null);
                setTargetRefresh((value) => value + 1);
            }
            setFailure(error);
            busy.current = false;
            setPhase('idle');
        }
    };

    const shownDraw = phase === 'rolling' ? draw : result;
    const shownValues = shownDraw || serverQuote;
    return (
        <div className="upgrade-layout">
            <StakePicker
                rows={rows}
                selected={selected}
                loading={inventoryLoading}
                failure={inventoryFailure}
                more={inventoryMore}
                locked={locked}
                formatPrice={formatPrice}
                onToggle={toggleStake}
                onLoadMore={() => loadInventory(inventoryOffset)}
                onRetry={() => loadInventory(inventoryAttemptOffset)}
                onReload={() => { clearOutcome(); setSelected([]); setTarget(null); loadInventory(); }}
            />
            <section className="upgrade-panel upgrade-center" aria-label={t('upgrade.chance')}>
                <UpgradeRing
                    threshold={shownDraw?.threshold ?? threshold}
                    stakeKop={shownValues?.stakeValue != null ? toKop(shownValues.stakeValue) : stakeKop}
                    targetKop={shownValues?.targetPrice != null ? toKop(shownValues.targetPrice) : targetKop}
                    target={shownDraw?.target || target}
                    roll={shownDraw?.roll}
                    rolling={phase === 'rolling'}
                    reducedMotion={reducedMotion}
                    result={result}
                    wonItem={result?.item && itemCache[result.item.storage_itemId]}
                    formatPrice={formatPrice}
                />
                {!target && !result && <p>{t(selected.length ? 'upgrade.chooseTarget' : 'upgrade.chooseStake')}</p>}
                {target && !thresholdAllowed(threshold) && <p>{t('upgrade.chanceBounds')}</p>}
                {limitReached && <p role="alert" className="upgrade-error">{t('upgrade.selectionLimit', { count: MAX_STAKE_ITEMS })}</p>}
                {failure && <p role="alert" className="upgrade-error">{clientErrorMessage(t, failure) || t('common.serverError')}</p>}
                <Button type="primary" className="upgrade-submit" aria-label={t('upgrade.submit')} disabled={!canUpgrade} onClick={upgrade}>
                    {t(locked ? 'upgrade.rolling' : 'upgrade.submit')}
                </Button>
            </section>
            <TargetPicker stakeKop={stakeKop} target={target} locked={locked} refreshVersion={targetRefresh} formatPrice={formatPrice} onSelect={chooseTarget} />
        </div>
    );
};

const Upgrade = () => {
    const { t } = useTranslation();
    const history = useHistory();
    const user = useSelector((state) => state.user);
    return (
        <div className="upgrade-page">
            <h2>{t('upgrade.title')}</h2>
            <p className="upgrade-intro">{t('upgrade.intro')}</p>
            {isAuthorized(user) ? <UpgradePlayer key={user.id || user.login} /> : (
                <div className="upgrade-panel upgrade-guest">
                    <p>{t('upgrade.guest')}</p>
                    <Button type="primary" onClick={() => history.push('/login', { goBack: true })}>{t('upgrade.signIn')}</Button>
                </div>
            )}
        </div>
    );
};

export default Upgrade;
