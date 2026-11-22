import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    chancePercent, ROLL_SCALE, rollAngle,
} from '../../helpers/upgrade';
import { gradeName, gradeStyle } from '../../helpers/grade';
import itemName from '../../helpers/itemName';
import { colorName } from '../../helpers/Case';

const UpgradeRing = ({
    threshold, stakeKop, targetKop, target, roll, rolling, reducedMotion, result, wonItem, formatPrice,
}) => {
    const { t, i18n } = useTranslation();
    const chance = chancePercent(threshold, i18n.language);
    const sector = Math.max(0, Math.min(ROLL_SCALE, threshold)) / ROLL_SCALE;
    const angle = roll == null ? 0 : 1440 + rollAngle(roll);
    const resultItem = (wonItem && !wonItem.placeholder && wonItem) || (result && {
        item_name: result.target.name, item_grade: result.target.grade, item_imagePath: result.target.imagePath,
    });
    return (
        <>
            <div className={`upgrade-ring${rolling && !reducedMotion ? ' upgrade-ring--rolling' : ''}`}>
                <svg viewBox="0 0 240 240" role="img" aria-label={t('upgrade.ringLabel', { chance })}>
                    <circle className="upgrade-ring__track" cx="120" cy="120" r="92" fill="none" strokeWidth="14" />
                    <circle
                        className="upgrade-ring__sector"
                        cx="120"
                        cy="120"
                        r="92"
                        fill="none"
                        strokeWidth="14"
                        pathLength="100"
                        strokeDasharray={`${sector * 100} 100`}
                        transform="rotate(-90 120 120)"
                    />
                    <g className="upgrade-ring__pointer" style={{ transform: `rotate(${angle}deg)` }}>
                        <path d="M120 12 L113 30 L127 30 Z" />
                    </g>
                </svg>
                <div className="upgrade-ring__chance" aria-hidden="true">{chance}</div>
            </div>
            <dl className="upgrade-values">
                <div><dt>{t('upgrade.stakeValue')}</dt><dd><span aria-label={t('upgrade.stakeValue')}>{formatPrice(stakeKop)}</span></dd></div>
                <div><dt>{t('upgrade.targetValue')}</dt><dd>{formatPrice(targetKop)}</dd></div>
            </dl>
            {target && <p className="upgrade-target-name">{itemName({ item_name: target.name }, t, target.itemId)} · {colorName(target.color, t)}</p>}
            {result && (
                <div className="upgrade-result" role="status" aria-live="polite" style={gradeStyle(result.won ? resultItem?.item_grade : null)}>
                    <h3>{t(result.won ? 'upgrade.won' : 'upgrade.lost')}</h3>
                    {result.won ? (
                        <>
                            {resultItem?.item_imagePath && <img src={resultItem.item_imagePath} alt="" />}
                            <strong>{itemName(resultItem, t, result.item?.storage_itemId)}</strong>
                            <p>{colorName(result.item?.storage_color || result.target.color, t)}</p>
                            <p className="upgrade-item__grade">{gradeName(resultItem?.item_grade, t)}</p>
                            <p>{t('upgrade.itemAdded')}</p>
                        </>
                    ) : <p>{t('upgrade.itemsUsed')}</p>}
                </div>
            )}
        </>
    );
};

export default UpgradeRing;
