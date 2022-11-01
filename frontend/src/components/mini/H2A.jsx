import React from 'react';
import PropTypes from 'prop-types';

function H2Component({ title, subTitle }) {
    return (
        <div className="title-a">
            <span className="title-a__1" />
            <span className="title-a__heading">
                {title}
                <span>{subTitle}</span>
            </span>
            <span className="title-a__r" />
        </div>
    );
}

H2Component.propTypes = {
    title: PropTypes.string,
    subTitle: PropTypes.string,
};

H2Component.defaultProps = {
    title: 'Назва',
    subTitle: 'Сабтайтл',
};
export default H2Component;
