import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_NAME } from '../config/publicInfo';

const SiteLogo = () => (
    <div className="header-sitename">
        <div className="header-sitename_beta">CS</div>
        <Link to="/" aria-label={SITE_NAME}>
            <img className="low" src="/favicon.svg" alt="" />
            <div className="full">CASES</div>
            <span>.ua</span>
        </Link>
    </div>
);

export default SiteLogo;
