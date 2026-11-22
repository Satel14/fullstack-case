import React, { useEffect, useState } from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { getUpgradeHistory } from '../../api/all/upgrade';
import { itemInfoFetch } from '../../store/actions/itemCache';
import itemName from '../../helpers/itemName';
import { gradeName, gradeStyle } from '../../helpers/grade';
import { colorName } from '../../helpers/Case';
import { chancePercent, rollPercent } from '../../helpers/upgrade';
import { clientErrorMessage } from '../../helpers/serverMessage';
import { siteLanguage } from '../../i18n/language';
import LocalTime from '../mini/LocalTime';

const PAGE_SIZE = 10;

const groupStake = (stake) => Array.from(stake.reduce((groups, item) => {
    const key = JSON.stringify([item.itemId, item.color, item.price]);
    groups.set(key, { ...item, key, count: (groups.get(key)?.count || 0) + 1 });
    return groups;
}, new Map()).values());

const UpgradeHistory = ({ onVerify }) => {
    const { t, i18n } = useTranslation();
    const dispatch = useDispatch();
    const itemCache = useSelector((state) => state.itemCache) || {};
    const [offset, setOffset] = useState(0);
    const [attempt, setAttempt] = useState(0);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [failure, setFailure] = useState(null);
    const language = i18n?.language;

    useEffect(() => {
        let current = true;
        const load = async () => {
            setLoading(true);
            setFailure(null);
            setItems([]);
            try {
                const { data } = await getUpgradeHistory(PAGE_SIZE, offset);
                if (current) {
                    setItems(data.items);
                    setTotal(data.total);
                }
            } catch (error) {
                if (current) {
                    setFailure(error);
                }
            } finally {
                if (current) {
                    setLoading(false);
                }
            }
        };
        load();
        return () => { current = false; };
    }, [offset, attempt]);

    useEffect(() => {
        const ids = new Set(items.flatMap((row) => [...row.stake.map((item) => item.itemId), row.targetItemId]));
        ids.forEach((id) => dispatch(itemInfoFetch(id)));
    }, [items, dispatch]);

    const priceText = (price) => t('upgrade.price', {
        value: new Intl.NumberFormat(siteLanguage(language), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(price)),
    });

    const renderItem = (id, color, price) => (
        <div className="provablyfair-upgrade-item" style={gradeStyle(itemCache[id]?.item_grade)}>
            <span>{itemName(itemCache[id], t, id)}</span>
            <span className="provablyfair-note">{[gradeName(itemCache[id]?.item_grade, t), colorName(color, t)].filter(Boolean).join(' · ')}</span>
            <span>{priceText(price)}</span>
        </div>
    );

    return (
        <section className="provablyfair-upgrade-history" aria-labelledby="upgrade-history-title">
            <h3 id="upgrade-history-title">{t('provablyFair.upgradeHistory')}</h3>
            {loading && <p role="status">{t('provablyFair.upgradeHistoryLoading')}</p>}
            {failure && (
                <>
                    <p role="alert" className="provablyfair-error">
                        {t('provablyFair.upgradeHistoryFailed')} {clientErrorMessage(t, failure) || t('common.serverError')}
                    </p>
                    <Button onClick={() => setAttempt((value) => value + 1)}>{t('provablyFair.upgradeHistoryRetry')}</Button>
                </>
            )}
            {!loading && !failure && items.length === 0 && <p>{t('provablyFair.upgradeHistoryEmpty')}</p>}
            {items.map((row) => (
                <article className="provablyfair-upgrade-record" key={row.upgradeId} aria-label={t('provablyFair.upgradeRecord', { id: row.upgradeId })}>
                    <div className="provablyfair-upgrade-summary">
                        <strong>{t('provablyFair.upgradeRecord', { id: row.upgradeId })}</strong>
                        <LocalTime value={row.created_at} />
                    </div>
                    <div className="provablyfair-upgrade-items">
                        <div>
                            <h4>{t('provablyFair.upgradeStake')} · {priceText(row.stakeValue)}</h4>
                            {groupStake(row.stake).map((item) => (
                                <div key={item.key}>
                                    {renderItem(item.itemId, item.color, item.price)}
                                    {item.count > 1 && <span>{t('provablyFair.upgradeItemCount', { count: item.count })}</span>}
                                </div>
                            ))}
                        </div>
                        <div>
                            <h4>{t('provablyFair.upgradeTarget')}</h4>
                            {renderItem(row.targetItemId, row.targetColor, row.targetPrice)}
                        </div>
                    </div>
                    <dl className="provablyfair-upgrade-values">
                        <div><dt>{t('provablyFair.upgradeChance')}</dt><dd>{chancePercent(row.threshold, language)}</dd></div>
                        <div><dt>{t('provablyFair.upgradeRoll')}</dt><dd>{rollPercent(row.roll, language)}</dd></div>
                        <div><dt>{t('provablyFair.result')}</dt><dd>{t(row.won ? 'provablyFair.upgradeWon' : 'provablyFair.upgradeLost')}</dd></div>
                    </dl>
                    <details>
                        <summary>{t('provablyFair.upgradeSeeds')}</summary>
                        <div>{t('provablyFair.nonce')}: {row.nonce}</div>
                        <div>{t('provablyFair.clientSeed')}: <code>{row.clientSeed}</code></div>
                        <div>{t('provablyFair.serverSeedHash')}: <code>{row.serverSeedHash}</code></div>
                        <div>
                            {t('provablyFair.revealedServerSeed')}: {row.revealedServerSeed ? <code>{row.revealedServerSeed}</code> : t('provablyFair.awaitingRotate')}
                        </div>
                    </details>
                    <Button disabled={!row.revealedServerSeed} onClick={() => onVerify(row)}>{t('provablyFair.upgradeCheck', { id: row.upgradeId })}</Button>
                </article>
            ))}
            {total > 0 && (
                <div className="provablyfair-upgrade-paging">
                    <Button disabled={loading || offset === 0} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}>{t('provablyFair.upgradePrevious')}</Button>
                    {!loading && !failure && <span>{t('provablyFair.upgradePage', { from: items.length ? offset + 1 : 0, to: offset + items.length, total })}</span>}
                    <Button disabled={loading || offset + PAGE_SIZE >= total} onClick={() => setOffset((value) => value + PAGE_SIZE)}>{t('provablyFair.upgradeNext')}</Button>
                </div>
            )}
        </section>
    );
};

export default UpgradeHistory;
