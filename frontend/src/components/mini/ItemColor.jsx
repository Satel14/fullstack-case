import React from 'react';
import { Tooltip } from 'antd';
import { useTranslation } from 'react-i18next';
import { colorName, getItemColor } from '../../helpers/Case';

const ItemColor = ({ color }) => {
    const { t } = useTranslation();

    if (color === 'default') {
        return null;
    }

    return (
        <Tooltip placement="top" title={colorName(color, t)}>
            <div
                className="item-color"
                role="img"
                aria-label={colorName(color, t)}
                style={{ backgroundColor: getItemColor(color) }}
            />
        </Tooltip>
    );
};

export default ItemColor;
