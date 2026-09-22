import React, { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { getAdminActions } from '../../api/all/admin';

const PAGE_SIZE = 20;

const renderPayload = (payload) => {
    if (payload === null || payload === undefined) {
        return '';
    }
    if (typeof payload === 'string') {
        return payload;
    }
    return JSON.stringify(payload);
};

const JournalTab = () => {
    const { t } = useTranslation();
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);

    const load = async (nextPage = page) => {
        setLoading(true);
        try {
            const res = await getAdminActions({ limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE });
            setRows(res.data || []);
        } catch (e) {
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(1); }, []);

    const columns = [
        { title: t('admin.journal.when'), dataIndex: 'created_at', key: 'created_at' },
        { title: t('admin.journal.admin'), dataIndex: 'adminId', key: 'adminId' },
        {
            title: t('admin.journal.action'),
            key: 'action',
            render: (row) => <Tag>{row.action}</Tag>,
        },
        {
            title: t('admin.journal.target'),
            key: 'target',
            render: (row) => `${row.targetType}:${row.targetId}`,
        },
        { title: t('admin.journal.reason'), dataIndex: 'reason', key: 'reason' },
        {
            title: t('admin.journal.payload'),
            key: 'payload',
            render: (row) => renderPayload(row.payload),
        },
    ];

    return (
        <Table
            rowKey="id"
            dataSource={rows}
            columns={columns}
            loading={loading}
            size="small"
            pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                onChange: (next) => { setPage(next); load(next); },
            }}
        />
    );
};

export default JournalTab;
