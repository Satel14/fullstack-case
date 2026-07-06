import React from 'react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';

const checkPrice = (data) => {
    const discount = parseInt(data.case_discount, 10);
    return Number.isFinite(discount) && discount > 0;
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
            {checkPrice(props.data) ? (
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
                    {getSummPrice(props.data.case_price, props.count)}
                    ₴
                </div>
            )}
        </>
    );
};

export default CasePrice;
