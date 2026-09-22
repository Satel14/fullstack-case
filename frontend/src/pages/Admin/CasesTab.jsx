import React, { useEffect, useState } from 'react';
import { Table, InputNumber, Switch, Button, Input, Alert, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { getAdminCases, updateAdminCase } from '../../api/all/admin';
import openNotification from '../../components/mini/openNotification';

const CasesTab = () => {
    const { t } = useTranslation();
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [edits, setEdits] = useState({});
    const [saving, setSaving] = useState(null);

    const load = async () => {
        setLoading(true);
        setFailed(false);
        try {
            const res = await getAdminCases();
            setCases(res.data || []);
            setEdits({});
        } catch (e) {
            setCases([]);
            setFailed(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const editValue = (row, field) => {
        const pending = edits[row.case_id];
        if (pending && pending[field] !== undefined) {
            return pending[field];
        }
        return row[field];
    };

    const setEdit = (id, field, value) => {
        setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    };

    const save = async (row) => {
        const payload = edits[row.case_id];
        if (!payload || Object.keys(payload).length === 0) {
            return;
        }
        setSaving(row.case_id);
        try {
            const res = await updateAdminCase(row.case_id, payload);
            setCases((prev) => prev.map((item) => (item.case_id === row.case_id ? res.data : item)));
            setEdits((prev) => {
                const next = { ...prev };
                delete next[row.case_id];
                return next;
            });
            openNotification('success', t('admin.cases.saved'), row.case_id);
        } catch (e) {
        } finally {
            setSaving(null);
        }
    };

    const columns = [
        { title: t('admin.cases.id'), dataIndex: 'case_id', key: 'case_id' },
        {
            title: t('admin.cases.name'),
            key: 'case_title',
            render: (row) => (
                <Input
                    value={editValue(row, 'case_title')}
                    onChange={(e) => setEdit(row.case_id, 'case_title', e.target.value)}
                />
            ),
        },
        {
            title: t('admin.cases.price'),
            key: 'case_price',
            render: (row) => (
                <InputNumber
                    min={0}
                    precision={0}
                    value={editValue(row, 'case_price')}
                    onChange={(value) => setEdit(row.case_id, 'case_price', value)}
                />
            ),
        },
        {
            title: t('admin.cases.discount'),
            key: 'case_discount',
            render: (row) => (
                <InputNumber
                    min={0}
                    precision={0}
                    value={editValue(row, 'case_discount')}
                    onChange={(value) => setEdit(row.case_id, 'case_discount', value)}
                />
            ),
        },
        {
            title: t('admin.cases.openLimit'),
            key: 'case_openLimit',
            render: (row) => (
                <InputNumber
                    min={-1}
                    precision={0}
                    value={editValue(row, 'case_openLimit')}
                    onChange={(value) => setEdit(row.case_id, 'case_openLimit', value)}
                />
            ),
        },
        { title: t('admin.cases.opened'), dataIndex: 'case_openedCount', key: 'case_openedCount' },
        {
            title: t('admin.cases.published'),
            key: 'case_published',
            render: (row) => (
                <Switch
                    checked={Number(editValue(row, 'case_published')) === 1}
                    onChange={(checked) => setEdit(row.case_id, 'case_published', checked ? 1 : 0)}
                />
            ),
        },
        {
            title: '',
            key: 'actions',
            render: (row) => (
                <Button
                    type="primary"
                    size="small"
                    disabled={!edits[row.case_id]}
                    loading={saving === row.case_id}
                    onClick={() => save(row)}
                >
                    {t('admin.save')}
                </Button>
            ),
        },
    ];

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            {failed && (
                <Alert
                    type="error"
                    showIcon
                    message={t('admin.cases.loadFailed')}
                />
            )}
            <Table
                rowKey="case_id"
                dataSource={cases}
                columns={columns}
                loading={loading}
                locale={failed ? { emptyText: t('admin.cases.loadFailed') } : undefined}
                pagination={{ pageSize: 20 }}
                size="small"
            />
        </Space>
    );
};

export default CasesTab;
