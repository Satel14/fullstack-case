import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tooltip } from 'antd';

function H2Component({ title, subTitle, help }) {
    return (
        <div className="title-a">
            <span className="title-a__1" />
            <span className="title-a__heading">
                {title}
                <span>{subTitle}</span>
            </span>
            <span className="title-a__r" />
            {(help && help !== '')
            && (
                <Tooltip placement="top" title={help}>
                    <Button
                    size="small"
                    type="text"
                    className="title-a__buttonhelp"
                    >
                        Що це?
                    </Button>
                </Tooltip>
                )}
        </div>
    );
}

H2Component.propTypes = {
    title: PropTypes.string,
    subTitle: PropTypes.string,
    help: PropTypes.string
};

H2Component.defaultProps = {
    title: '',
    subTitle: '',
    help: ''
};
export default H2Component;
