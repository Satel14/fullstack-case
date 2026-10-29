import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import {
 Modal, Table, Input, Button, Tag,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import Loader from '../components/mini/Loader';
import ItemColor from '../components/mini/ItemColor';
import openNotification from '../components/mini/openNotification';
import { clientErrorMessage, isRefusal } from '../helpers/serverMessage';
import { gradeName } from '../helpers/grade';
import { isAuthorized } from '../helpers/Player';
import { itemInfoFetch } from '../store/actions/itemCache';
import {
    getProvablyFairState,
    setClientSeed as apiSetClientSeed,
    rotateSeed as apiRotateSeed,
    getOpenHistory,
    verifyOpen,
} from '../api/all/provablyFair';

const HISTORY_PAGE = 50;

const olderThanShown = (shown, page) => {
    if (!shown.length) {
        return page;
    }
    const oldestShownId = shown[shown.length - 1].id;
    return page.filter((open) => open.id < oldestShownId);
};

const fetchOlderOpens = async (shown, offset, stillWanted) => {
    const h = await getOpenHistory(HISTORY_PAGE, offset);
    const page = h.data || [];
    const next = {
        opens: olderThanShown(shown, page),
        offset: offset + page.length,
        more: page.length === HISTORY_PAGE,
    };
    if (next.opens.length || !next.more || !stillWanted()) {
        return next;
    }
    return fetchOlderOpens(shown, next.offset, stillWanted);
};

const ProvablyFair = () => {
    const { t } = useTranslation();
    const routerHistory = useHistory();
    const loggedIn = isAuthorized(useSelector((store) => store.user));
    const itemCache = useSelector((store) => store.itemCache);
    const dispatch = useDispatch();
    const [state, setState] = useState(null);
    const [loadFailed, setLoadFailed] = useState(false);
    const [clientSeedInput, setClientSeedInput] = useState('');
    const [history, setHistory] = useState([]);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const [historyFailed, setHistoryFailed] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(false);
    const [historyOffset, setHistoryOffset] = useState(0);
    const [calc, setCalc] = useState({
        serverSeed: '', clientSeed: '', nonce: '', caseId: '', openId: null,
    });
    const [calcResult, setCalcResult] = useState(null);
    const [calcError, setCalcError] = useState(null);
    const generation = useRef(0);
    const mounted = useRef(true);

    const loadHistory = useCallback(async (mine, loaded = [], offset = 0) => {
        setHistoryLoading(true);
        try {
            const next = await fetchOlderOpens(loaded, offset, () => mine === generation.current);
            if (mine === generation.current) {
                setHistory([...loaded, ...next.opens]);
                setHistoryOffset(next.offset);
                setHasMoreHistory(next.more);
                setHistoryLoaded(true);
                setHistoryFailed(false);
            }
        } catch (e) {
            if (mine === generation.current) {
                setHistoryFailed(true);
                if (!loaded.length) {
                    setHistoryLoaded(false);
                }
            }
        }
        if (mine === generation.current) {
            setHistoryLoading(false);
        }
    }, []);

    const load = useCallback(async () => {
        if (!mounted.current || !loggedIn) {
            return;
        }
        generation.current += 1;
        const mine = generation.current;
        setLoadFailed(false);
        try {
            const res = await getProvablyFairState();
            if (mine !== generation.current) {
                return;
            }
            setState(res.data);
            setClientSeedInput(res.data.active.clientSeed);
        } catch (e) {
            if (mine === generation.current) {
                setLoadFailed(true);
            }
            return;
        }
        await loadHistory(mine);
    }, [loadHistory, loggedIn]);

    useEffect(() => {
        history.forEach((open) => dispatch(itemInfoFetch(open.resultItemId)));
    }, [history, dispatch]);

    const resultItemId = calcResult && calcResult.itemId;
    useEffect(() => {
        if (resultItemId) {
            dispatch(itemInfoFetch(resultItemId));
        }
    }, [resultItemId, dispatch]);

    const itemName = (id) => (itemCache[id] && itemCache[id].item_name) || t('item.placeholder', { id: String(id) });

    const reloadHistory = () => loadHistory(generation.current);

    const loadMoreHistory = () => loadHistory(generation.current, history, historyOffset);

    useEffect(() => {
        mounted.current = true;
        load();
        return () => {
            mounted.current = false;
            generation.current += 1;
        };
    }, [load]);

    const reportFailure = (failure) => {
        openNotification('error', t('common.error'), clientErrorMessage(failure) || t('common.serverError'));
    };

    const onSaveClientSeed = async () => {
        try {
            await apiSetClientSeed(clientSeedInput);
        } catch (e) {
            reportFailure(e);
            return;
        }
        openNotification('success', t('provablyFair.clientSeedSaved'));
        await load();
    };

    const onRotate = () => {
        Modal.confirm({
            content: t('provablyFair.rotateConfirm'),
            onOk: async () => {
                try {
                    await apiRotateSeed();
                } catch (e) {
                    reportFailure(e);
                    return;
                }
                openNotification('success', t('provablyFair.rotated'));
                await load();
            },
        });
    };

    const onCompute = async () => {
        setCalcError(null);
        setCalcResult(null);

        const nonceInt = parseInt(calc.nonce, 10);
        const incomplete = !calc.serverSeed.trim()
            || !calc.clientSeed
            || (!calc.openId && !calc.caseId.trim())
            || Number.isNaN(nonceInt)
            || nonceInt < 0;
        if (incomplete) {
            // Guard client-side so we never fire a request that would 422.
            setCalcError(t('provablyFair.verifyFailed'));
            return;
        }

        try {
            const payload = {
                serverSeed: calc.serverSeed.trim(),
                clientSeed: calc.clientSeed,
                nonce: nonceInt,
                caseId: calc.caseId.trim(),
            };
            if (calc.openId) {
                payload.openId = calc.openId;
            }
            const res = await verifyOpen(payload);
            if (mounted.current) {
                setCalcResult(res.data);
            }
        } catch (e) {
            if (mounted.current) {
                const refusal = e.error === 429 ? clientErrorMessage(e) : t('provablyFair.verifyFailed');
                setCalcError(isRefusal(e) ? refusal : t('common.serverError'));
            }
        }
    };

    const onVerifyRow = (row) => {
        setCalc({
            serverSeed: row.revealedServerSeed || '',
            clientSeed: row.clientSeed,
            nonce: String(row.nonce),
            caseId: row.caseId,
            openId: row.verification === 'snapshot' ? row.id : null,
        });
        setCalcResult(null);
    };

    const computedGrade = calcResult
        && (gradeName(itemCache[calcResult.itemId] && itemCache[calcResult.itemId].item_grade, t) || gradeName(calcResult.rarity, t));

    const columns = [
        { title: t('provablyFair.case'), dataIndex: 'caseId' },
        { title: t('provablyFair.nonce'), dataIndex: 'nonce' },
        {
            title: t('provablyFair.result'),
            render: (_, r) => (
                <span className="provablyfair-item">
                    {itemName(r.resultItemId)}
                    <ItemColor color={r.resultColor} />
                </span>
            ),
        },
        {
            title: t('provablyFair.status'),
            render: (_, r) => {
                if (r.verification === 'none') {
                    return <Tag title={t('provablyFair.legacyNote')}>{t('provablyFair.legacy')}</Tag>;
                }
                if (!r.revealedServerSeed) {
                    return <Tag>{t('provablyFair.awaitingRotate')}</Tag>;
                }
                if (r.verification === 'unknown') {
                    return <Tag title={t('provablyFair.unknownNote')}>{t('provablyFair.verificationUnknown')}</Tag>;
                }
                return r.verification === 'current'
                    ? <Tag color="gold" title={t('provablyFair.currentNote')}>{t('provablyFair.verifiableCurrent')}</Tag>
                    : <Tag color="green">{t('provablyFair.verifiable')}</Tag>;
            },
        },
        {
            title: '',
            render: (_, r) => (r.revealedServerSeed && r.verification !== 'none'
                ? <Button size="small" onClick={() => onVerifyRow(r)}>{t('provablyFair.verify')}</Button>
                : null),
        },
    ];

    const renderPlayerSection = () => {
        if (loadFailed) {
            return (
                <>
                    <p className="provablyfair-error">{t('provablyFair.loadFailed')}</p>
                    <Button icon={<ReloadOutlined />} onClick={load}>{t('provablyFair.retry')}</Button>
                </>
            );
        }
        if (!state) {
            return <Loader />;
        }
        return (
            <>
                <h3>{t('provablyFair.currentSeeds')}</h3>
                <div>{t('provablyFair.serverSeedHash')}: <code>{state.active.serverSeedHash}</code></div>
                <div>{t('provablyFair.nonce')}: {state.active.nonce}</div>
                <div>
                    {t('provablyFair.clientSeed')}:
                    <Input value={clientSeedInput} onChange={(e) => setClientSeedInput(e.target.value)} style={{ maxWidth: 320 }} />
                    <Button onClick={onSaveClientSeed}>{t('provablyFair.save')}</Button>
                </div>
                <Button danger onClick={onRotate}>{t('provablyFair.rotate')}</Button>
                {state.previous && (
                    <div>
                        {t('provablyFair.revealedServerSeed')}: <code>{state.previous.serverSeed}</code>
                        <div className="provablyfair-note">{t('provablyFair.revealedServerSeedNote')}</div>
                    </div>
                )}

                <h3>{t('provablyFair.history')}</h3>
                {historyLoaded && <Table rowKey="id" dataSource={history} columns={columns} pagination={false} />}
                {historyFailed && <p className="provablyfair-error">{t('provablyFair.historyFailed')}</p>}
                {historyFailed && !historyLoaded && (
                    <Button icon={<ReloadOutlined />} loading={historyLoading} onClick={reloadHistory}>{t('provablyFair.retry')}</Button>
                )}
                {historyLoaded && hasMoreHistory && (
                    <Button icon={<ReloadOutlined />} loading={historyLoading} onClick={loadMoreHistory}>{t('provablyFair.loadMore')}</Button>
                )}
            </>
        );
    };

    return (
        <div className="provablyfairpage">
            <h2>{t('provablyFair.title')}</h2>
            <h3>{t('provablyFair.algorithm')}</h3>
            <p>{t('provablyFair.intro')}</p>
            <p>{t('provablyFair.colorNote')}</p>

            {loggedIn ? renderPlayerSection() : (
                <div className="provablyfair-guest">
                    <p>{t('provablyFair.loginCta')}</p>
                    <Button type="primary" onClick={() => routerHistory.push({ pathname: '/login', state: { goBack: true } })}>
                        {t('menu.login')}
                    </Button>
                </div>
            )}

            <h3>{t('provablyFair.calculator')}</h3>
            <Input placeholder={t('provablyFair.serverSeedPlaceholder')} value={calc.serverSeed} onChange={(e) => setCalc({ ...calc, serverSeed: e.target.value, openId: null })} />
            <Input placeholder={t('provablyFair.clientSeedPlaceholder')} value={calc.clientSeed} onChange={(e) => setCalc({ ...calc, clientSeed: e.target.value, openId: null })} />
            <Input placeholder={t('provablyFair.noncePlaceholder')} value={calc.nonce} onChange={(e) => setCalc({ ...calc, nonce: e.target.value, openId: null })} />
            <Input placeholder={t('provablyFair.caseIdPlaceholder')} value={calc.caseId} onChange={(e) => setCalc({ ...calc, caseId: e.target.value, openId: null })} />
            <Button onClick={onCompute}>{t('provablyFair.compute')}</Button>
            {calcResult && (
                <div className="provablyfair-item">
                    {t('provablyFair.computed')}: {itemName(calcResult.itemId)}
                    {computedGrade && ` — ${computedGrade}`}
                    <ItemColor color={calcResult.color} />
                </div>
            )}
            {calcResult && calcResult.source === 'snapshot' && (
                <>
                    <div className={calcResult.seedMatches ? 'provablyfair-ok' : 'provablyfair-error'}>
                        {t(calcResult.seedMatches ? 'provablyFair.seedMatches' : 'provablyFair.seedMismatch')}
                    </div>
                    <div className={calcResult.matchesRecord ? 'provablyfair-ok' : 'provablyfair-error'}>
                        {t(calcResult.matchesRecord ? 'provablyFair.matchesRecord' : 'provablyFair.mismatchRecord')}
                    </div>
                </>
            )}
            {calcError && <div className="provablyfair-error">{calcError}</div>}
        </div>
    );
};

export default ProvablyFair;
