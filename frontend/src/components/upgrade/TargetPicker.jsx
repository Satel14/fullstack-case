import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import { Button, Input } from 'antd';
import { useTranslation } from 'react-i18next';
import { getUpgradeTargets } from '../../api/all/upgrade';
import itemName from '../../helpers/itemName';
import { colorName } from '../../helpers/Case';
import { gradeName, gradeStyle } from '../../helpers/grade';
import { clientErrorMessage } from '../../helpers/serverMessage';
import {
    MULTIPLIERS, multiplierRange, targetPriceRange, toKop,
} from '../../helpers/upgrade';

const PAGE_LIMIT = 60;

const TargetPicker = ({
    stakeKop, target, locked, formatPrice, onSelect, refreshVersion = 0,
}) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [multiplier, setMultiplier] = useState(null);
    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [failure, setFailure] = useState(null);
    const request = useRef(0);
    const lastRefresh = useRef(refreshVersion);
    const searching = search.trim() !== query;

    useEffect(() => {
        if (search.trim() === query) {
            return undefined;
        }
        const timer = setTimeout(() => setQuery(search.trim()), 300);
        return () => clearTimeout(timer);
    }, [search, query]);

    const load = useCallback(async (nextOffset = 0) => {
        request.current += 1;
        const attempt = request.current;
        setItems([]);
        setFailure(null);
        setOffset(nextOffset);
        if (!stakeKop) {
            setTotal(0);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const range = multiplier ? multiplierRange(stakeKop, multiplier) : targetPriceRange(stakeKop);
            const answer = await getUpgradeTargets({
                ...range, ...(query && { search: query }), limit: PAGE_LIMIT, offset: nextOffset,
            });
            if (attempt === request.current) {
                setItems(answer.data.items);
                setTotal(answer.data.total);
            }
        } catch (error) {
            if (attempt === request.current) {
                setFailure(error);
            }
        } finally {
            if (attempt === request.current) {
                setLoading(false);
            }
        }
    }, [stakeKop, multiplier, query]);

    useEffect(() => {
        load();
        return () => { request.current += 1; };
    }, [load]);

    useEffect(() => {
        if (lastRefresh.current !== refreshVersion) {
            lastRefresh.current = refreshVersion;
            load(offset);
        }
    }, [refreshVersion, load, offset]);

    return (
        <section className="upgrade-panel" aria-labelledby="upgrade-target-title" aria-busy={loading || searching}>
            <h3 id="upgrade-target-title">{t('upgrade.targets')}</h3>
            <label htmlFor="upgrade-search">{t('upgrade.search')}</label>
            <Input
                id="upgrade-search"
                maxLength={64}
                value={search}
                disabled={locked || !stakeKop}
                onChange={(event) => { setSearch(event.target.value); onSelect(null); }}
            />
            <div className="upgrade-multipliers" role="group" aria-label={t('upgrade.multipliers')}>
                <Button
                    aria-pressed={multiplier === null}
                    disabled={locked || !stakeKop}
                    onClick={() => { setMultiplier(null); onSelect(null); }}
                >
                    {t('upgrade.allTargets')}
                </Button>
                {MULTIPLIERS.map((value) => (
                    <Button
                        key={value}
                        aria-pressed={multiplier === value}
                        disabled={locked || !stakeKop}
                        onClick={() => { setMultiplier(value); onSelect(null); }}
                    >
                        {t('upgrade.multiplier', { multiplier: value })}
                    </Button>
                ))}
            </div>
            {!stakeKop && <p>{t('upgrade.chooseStake')}</p>}
            {(loading || searching) && <p>{t('upgrade.loadingTargets')}</p>}
            {failure && (
                <div>
                    <p role="alert" className="upgrade-error">{clientErrorMessage(t, failure) || t('common.serverError')}</p>
                    <Button disabled={locked || loading || searching} onClick={() => load(offset)}>{t('upgrade.retryTargets')}</Button>
                </div>
            )}
            {stakeKop > 0 && !loading && !searching && !failure && !items.length && <p>{t('upgrade.emptyTargets')}</p>}
            <div className="upgrade-choices">
                {items.map((item) => {
                    const label = t('upgrade.itemLabel', {
                        name: itemName({ item_name: item.name }, t, item.itemId),
                        color: colorName(item.color, t),
                        price: formatPrice(toKop(item.price)),
                    });
                    return (
                        <button
                            key={`${item.itemId}:${item.color}`}
                            type="button"
                            className="upgrade-item"
                            style={gradeStyle(item.grade)}
                            title={label}
                            aria-label={label}
                            aria-pressed={target?.itemId === item.itemId && target?.color === item.color}
                            disabled={locked || loading || searching}
                            onClick={() => onSelect(item)}
                        >
                            {item.imagePath && <img src={item.imagePath} alt="" loading="lazy" />}
                            <span className="upgrade-item__name">{itemName({ item_name: item.name }, t, item.itemId)}</span>
                            <span>{colorName(item.color, t)}</span>
                            <span className="upgrade-item__grade">{gradeName(item.grade, t)}</span>
                            <strong>{formatPrice(toKop(item.price))}</strong>
                        </button>
                    );
                })}
            </div>
            {stakeKop > 0 && total > 0 && (
                <div className="upgrade-paging">
                    <p>{t('upgrade.targetCount', { start: offset + 1, end: Math.min(offset + PAGE_LIMIT, total), total })}</p>
                    <Button disabled={locked || loading || searching || offset === 0} onClick={() => load(Math.max(0, offset - PAGE_LIMIT))}>
                        {t('upgrade.previousTargets')}
                    </Button>
                    <Button disabled={locked || loading || searching || offset + PAGE_LIMIT >= total} onClick={() => load(offset + PAGE_LIMIT)}>
                        {t('upgrade.nextTargets')}
                    </Button>
                </div>
            )}
        </section>
    );
};

export default TargetPicker;
