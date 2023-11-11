import React from 'react';
import PropTypes from 'prop-types';

const ContentLayout = ({ children }) => (
    <>
        <div className="site-layout-content">{children}</div>
    </>
);

ContentLayout.propTypes = {
    children: PropTypes.element,
};

ContentLayout.defaultProps = {
    children: 'Main page',
};

export default ContentLayout;
