import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import itemName from '../../helpers/itemName';
import { colorName } from '../../helpers/Case';
import { gradeName, gradeStyle } from '../../helpers/grade';
import { clientErrorMessage } from '../../helpers/serverMessage';
import { MAX_STAKE_ITEMS } from '../../helpers/upgrade';

const StakePicker = ({
    rows, selected, loading, failure, more, locked, formatPrice, onToggle, onLoadMore, onReload, onRetry,
}) => {
    const { t } = useTranslation();
    return (
        <section className="upgrade-panel" aria-labelledby="upgrade-stake-title" aria-busy={loading}>
            <h3 id="upgrade-stake-title">{t('upgrade.inventory')}</h3>
            <p>{t('upgrade.selected', { count: selected.length, max: MAX_STAKE_ITEMS })}</p>
            <Button onClick={onReload} disabled={locked || loading}>{t('upgrade.reloadInventory')}</Button>
            {failure && (
                <div>
                    <p role="alert" className="upgrade-error">{clientErrorMessage(t, failure) || t('common.serverError')}</p>
                    <Button onClick={onRetry} disabled={locked || loading}>{t('upgrade.retryInventory')}</Button>
                </div>
            )}
            {loading && <p>{t('upgrade.loadingInventory')}</p>}
            {!loading && !failure && !rows.length && <p>{t('upgrade.emptyInventory')}</p>}
            <div className="upgrade-choices">
                {rows.map((row) => {
                    const chosen = selected.includes(row.storage_id);
                    const price = row.priceKop > 0 ? formatPrice(row.priceKop) : t('upgrade.priceUnavailable');
                    const label = t('upgrade.itemLabel', {
                        name: itemName(row.item, t, row.storage_itemId), color: colorName(row.storage_color, t), price,
                    });
                    return (
                        <button
                            key={row.storage_id}
                            type="button"
                            className="upgrade-item"
                            style={gradeStyle(row.item?.item_grade)}
                            title={label}
                            aria-label={label}
                            aria-pressed={chosen}
                            disabled={locked || loading || (!chosen && !row.priceKop)}
                            onClick={() => onToggle(row)}
                        >
                            {row.item?.item_imagePath && <img src={row.item.item_imagePath} alt="" loading="lazy" />}
                            <span className="upgrade-item__name">{itemName(row.item, t, row.storage_itemId)}</span>
                            <span>{colorName(row.storage_color, t)}</span>
                            <span className="upgrade-item__grade">{gradeName(row.item?.item_grade, t)}</span>
                            <strong>{price}</strong>
                        </button>
                    );
                })}
            </div>
            {more && !failure && (
                <Button onClick={onLoadMore} disabled={locked || loading}>{t('upgrade.moreInventory')}</Button>
            )}
        </section>
    );
};

export default StakePicker;
