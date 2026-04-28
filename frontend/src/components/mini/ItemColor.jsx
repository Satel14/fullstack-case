import React from 'react';
import { Tooltip } from 'antd';
import { capitalize } from 'lodash';
import { getItemColor } from '../../helpers/Case';

const ItemColor = ({ color }) => {
    return (
        <>
            {color !== 'default'
                && (
                    <Tooltip placement="top" title={capitalize(color)}>
                        <div className="item-color" style={{ backgroundColor: getItemColor(color) }} />
                    </Tooltip>
                )}
        </>
    )
}

export default ItemColor;
