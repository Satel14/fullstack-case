/* eslint-disable */
import React from 'react';
import { Link } from 'react-router-dom';
import CasePrice from './CasePrice';

const checkPrice = (data) => {
    const discount = Number(data?.case_discount || 0);
    return discount > 0;
};

const formatNumber = (value) => new Intl.NumberFormat('uk-UA').format(Number(value) || 0);

const getOpenStats = (data) => {
    const opened = Number(data?.case_openedCount || 0);
    const hasLimit = data?.case_openLimit !== undefined
        && data?.case_openLimit !== null
        && Number(data?.case_openLimit) !== -1;
    const limitRaw = hasLimit ? Number(data?.case_openLimit) : null;
    const limited = hasLimit && Number.isFinite(limitRaw) && limitRaw >= 0;
    const limit = limited ? limitRaw : null;

    return {
        opened,
        limit,
        limited,
        progressText: limited ? `${formatNumber(opened)} / ${formatNumber(limit)}` : `${formatNumber(opened)} / INF`,
    };
};

const CaseMini = ({ data }) => {
    const stats = getOpenStats(data);
    const caseTitle = data.case_title || data.name || data.case_id;

    return (
        <Link
            className={checkPrice(data) ? 'case discount' : 'case'}
            to={`/case/${data.case_id}`}
        >
            <div className="case-openstats">
                <span className="case-openstats__progress">{stats.progressText}</span>
            </div>
            <img className="case-img" src={data.case_img} alt={caseTitle}/>
            <div className="case-name">{caseTitle}</div>
            <CasePrice data={data}/>
        </Link>
    );
};

export default CaseMini;
