import React, {
    useCallback, useEffect, useRef, useState,
} from 'react';
import {
    Alert, Button, Input, Space, Spin, Table,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { getAdminStats } from '../../api/all/admin';
import { serverText } from '../../helpers/serverMessage';

const DAY = 86400000;
const FIGURES = ['opens', 'spent', 'valueGiven', 'realizedEdge', 'sales', 'deposits', 'bonuses', 'promocodes', 'adminCorrections', 'withdrawalsCompleted'];
const COUNTS = ['opens', 'withdrawalsCompleted'];

const StatsTab = ({ active = true }) => {
    const { t } = useTranslation();
    const requestId = useRef(0);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [failure, setFailure] = useState(null);
    const lastQuery = useRef({});

    const load = useCallback(async (dates) => {
        const id = ++requestId.current;
        lastQuery.current = dates;
        setLoading(true);
        setFailure(null);
        setData(null);
        try {
            const res = await getAdminStats(dates);
            if (id !== requestId.current) { return; }
            setData(res.data);
            setFrom(res.data.period.from.slice(0, 10));
            setTo(new Date(new Date(res.data.period.to).getTime() - 1).toISOString().slice(0, 10));
        } catch (e) {
            if (id !== requestId.current) { return; }
            setFailure(e || {});
        } finally {
            if (id === requestId.current) { setLoading(false); }
        }
    }, []);

    useEffect(() => {
        if (active) { load({}); }
        return () => { requestId.current += 1; };
    }, [active, load]);

    const start = new Date(`${from}T00:00:00.000Z`).getTime();
    const end = new Date(`${to}T00:00:00.000Z`).getTime() + DAY;
    const validPeriod = Number.isFinite(start) && Number.isFinite(end) && end > start && end - start <= 365 * DAY;
    const apply = () => load({ from: new Date(start).toISOString(), to: new Date(end).toISOString() });
    const amount = (value) => (value === null ? t('admin.stats.noData') : `${value} ${t('admin.stats.creditUnit')}`);
    const edge = (value) => (value === null ? t('admin.stats.noData') : t('admin.stats.percent', { value: (Number(value) * 100).toFixed(2) }));
    const figure = (key) => {
        if (key === 'realizedEdge') { return edge(data.totals[key]); }
        return COUNTS.includes(key) ? data.totals[key] : amount(data.totals[key]);
    };
    const numericSort = (field) => (a, b) => {
        if (a[field] === null) { return b[field] === null ? 0 : 1; }
        if (b[field] === null) { return -1; }
        const left = BigInt(a[field].replace('.', ''));
        const right = BigInt(b[field].replace('.', ''));
        if (left === right) { return 0; }
        return left < right ? -1 : 1;
    };
    const columns = [
        {
            title: t('admin.stats.case'), key: 'caseId', className: 'admin-nowrap', render: (row) => row.title || row.caseId,
        },
        { title: t('admin.stats.opens'), dataIndex: 'opens', key: 'opens' },
        {
            title: t('admin.stats.spent'), dataIndex: 'spent', key: 'spent', render: amount, sorter: numericSort('spent'),
        },
        {
            title: t('admin.stats.valueGiven'), dataIndex: 'valueGiven', key: 'valueGiven', render: amount,
        },
        {
            title: t('admin.stats.realizedEdge'), dataIndex: 'realizedEdge', key: 'realizedEdge', render: edge, sorter: numericSort('realizedEdge'),
        },
        {
            title: t('admin.stats.expectedEdge'), dataIndex: 'expectedEdge', key: 'expectedEdge', render: edge,
        },
    ];

    return (
        <div className="admin-stats">
            <Space className="admin-stats__dates" align="end" wrap>
                <label htmlFor="admin-stats-from">
                    {t('admin.stats.from')}
                    <Input id="admin-stats-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} disabled={loading} />
                </label>
                <label htmlFor="admin-stats-to">
                    {t('admin.stats.to')}
                    <Input id="admin-stats-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} disabled={loading} />
                </label>
                <Button type="primary" disabled={loading || !validPeriod} onClick={apply}>{t('admin.stats.apply')}</Button>
            </Space>
            <p>{t('admin.stats.periodHint')}</p>
            {loading && <div role="status"><Spin size="small" /> {t('admin.stats.loading')}</div>}
            {failure && (
                <Alert
                    type="error"
                    showIcon
                    message={t('admin.stats.loadFailed')}
                    description={serverText(t, failure) || t('common.serverError')}
                    action={<Button onClick={() => load(lastQuery.current)}>{t('admin.stats.retry')}</Button>}
                />
            )}
            {data && (
                <>
                    <dl className="admin-stats__figures">
                        {FIGURES.map((key) => (
                            <div key={key}>
                                <dt>{t(`admin.stats.${key}`)}</dt>
                                <dd>{figure(key)}</dd>
                            </div>
                        ))}
                    </dl>
                    <p>{t('admin.stats.valueHint')}</p>
                    {data.totals.unvaluedOpens > 0 && (
                        <Alert type="warning" showIcon message={t('admin.stats.incompleteValues', { count: data.totals.unvaluedOpens })} />
                    )}
                    {data.cases.some((row) => row.unpricedOpens > 0) && (
                        <Alert type="warning" showIcon message={t('admin.stats.incompleteSpend')} />
                    )}
                    <Table
                        rowKey="caseId"
                        dataSource={data.cases}
                        columns={columns}
                        size="small"
                        scroll={data.cases.length ? { x: 800 } : undefined}
                        pagination={false}
                        locale={{
                            emptyText: t('admin.stats.empty'), triggerAsc: t('admin.stats.sortAsc'), triggerDesc: t('admin.stats.sortDesc'), cancelSort: t('admin.stats.sortCancel'),
                        }}
                    />
                    <p>{t('admin.stats.expectedHint')}</p>
                </>
            )}
        </div>
    );
};

export default StatsTab;
