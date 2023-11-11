import React from 'react';
import { Tooltip } from 'antd';

const checkPrice = (data) => {
    if (parseInt(data.case_discount, 10) !== 0) {
        return true;
    }
    return false;
};

const getSummPrice = (price, openCount) => {
    if (!openCount) {
        return price;
    }
    return parseInt(openCount, 10) * price;
};

const CasePrice = (props) => (
    <>
        {checkPrice(props.data) ? (
            <>
                <div className="case-price">
                    <Tooltip placement="right" title="Скидка">
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

export default CasePrice;
