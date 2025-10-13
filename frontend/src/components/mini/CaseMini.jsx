/* eslint-disable */
import React from 'react';
import { Link } from 'react-router-dom';
import CasePrice from './CasePrice';

const checkPrice = (data) => {
    if (parseInt(data.case_discount, 10) !== 0) {
        return true;
    } else {
        return false;
    }
};

const CaseMini = ({ data }) => (
    <Link
        className={checkPrice(data) ? 'case discount' : 'case'}
        to={`/case/${data.case_id}`}>
        <img className="case-img" src={data.case_img} alt={data.case_title}/>
        <div className="case-name">{data.name}</div>
        {data.case_openLimit !== 0 && (
            <div className="case-openlimit">
                {data.case_openedCount}
                {' /'}
                {' '}
                {data.case_openLimit}
            </div>
        )}
        <CasePrice data={data}/>
    </Link>
);

export default CaseMini;