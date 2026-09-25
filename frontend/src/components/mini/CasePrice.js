import React from 'react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

export const effectivePrice = (data) => {
    const discount = Number(data.case_discount) || 0;
    return discount > 0 ? discount : Number(data.case_price) || 0;
};

export const hasDiscount = (data) => {
    const discount = Number(data.case_discount) || 0;
    return discount > 0 && discount < (Number(data.case_price) || 0);
};

const getSummPrice = (price, openCount) => {
    if (!openCount) {
        return price;
    }
    return parseInt(openCount, 10) * price;
};

const CasePrice = (props) => {
    const { t } = useTranslation();
    return (
        <>
            {hasDiscount(props.data) ? (
                <>
                    <div className="case-price">
                        <Tooltip placement="right" title={t('common.discount')}>
                            {getSummPrice(props.data.case_discount, props.count)}
                            ₴
                        </Tooltip>
                    </div>
                    <div className="case-price-old">
                        {getSummPrice(props.data.case_price, props.count)}
                        ₴
                    </div>
                </>
            ) : (
                <div className="case-price">
                    {getSummPrice(effectivePrice(props.data), props.count)}
                    ₴
                </div>
            )}
        </>
    );
};

export default CasePrice;
