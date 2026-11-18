import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert, Button, Form, Input, InputNumber, Modal, Space, Switch, Table,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { getAdminPromocodes, createAdminPromocode, updateAdminPromocode } from '../../api/all/admin';
import openNotification from '../../components/mini/openNotification';

const MYSQL_INT_MAX = 2147483647;
const MUTABLE = ['active', 'limit', 'expiresAt', 'description'];

const localTime = (value) => {
    if (!value) { return ''; }
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
};

const draftOf = (row) => ({
    code: row ? row.code : '',
    bonus: row ? String(row.bonus) : '',
    limit: row ? row.limit : 1,
    active: row ? row.active : true,
    expiresAt: localTime(row && row.expiresAt),
    description: row ? row.description || '' : '',
});

const validIf = (valid, message) => (valid ? Promise.resolve() : Promise.reject(new Error(message)));

const PromocodesTab = () => {
    const { t, i18n } = useTranslation();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [editing, setEditing] = useState(undefined);
    const [saving, setSaving] = useState(null);
    const [form] = Form.useForm();

    const load = useCallback(async () => {
        setLoading(true);
        setFailed(false);
        try {
            const res = await getAdminPromocodes();
            setRows(res.data);
        } catch (e) {
            setFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async (row, fields) => {
        setSaving(row ? row.code : '');
        try {
            const res = row ? await updateAdminPromocode(row.code, fields) : await createAdminPromocode(fields);
            setRows((prev) => (row ? prev.map((item) => (item.code === row.code ? res.data : item)) : [res.data, ...prev]));
            openNotification('success', t('admin.promocodes.saved'), res.data.code);
            return true;
        } catch (e) {
            const message = e && e.error && e.message ? e.message : t('common.serverError');
            openNotification('error', t('admin.promocodes.saveFailed'), message);
            return false;
        } finally {
            setSaving(null);
        }
    };

    const submit = async (values) => {
        const fields = { ...values, expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null };
        if (editing) {
            const initial = draftOf(editing);
            MUTABLE.forEach((field) => {
                if (values[field] === initial[field]) { delete fields[field]; }
            });
            delete fields.code;
            delete fields.bonus;
            if (Object.keys(fields).length === 0) {
                setEditing(undefined);
                return;
            }
        } else if (!fields.expiresAt) {
            delete fields.expiresAt;
        }
        if (await save(editing, fields)) { setEditing(undefined); }
    };

    const time = (value, emptyKey = 'admin.promocodes.noExpiry') => (value ? (
        <time dateTime={value}>{new Date(value).toLocaleString(i18n.resolvedLanguage || i18n.language)}</time>
    ) : t(emptyKey));

    const columns = [
        { title: t('admin.promocodes.code'), dataIndex: 'code', key: 'code' },
        { title: t('admin.promocodes.bonus'), key: 'bonus', render: (row) => Number(row.bonus).toFixed(2) },
        { title: t('admin.promocodes.uses'), key: 'uses', render: (row) => `${row.used} / ${row.limit}` },
        {
            title: t('admin.promocodes.active'),
            key: 'active',
            render: (row) => (
                <Switch
                    aria-label={t('admin.promocodes.activeFor', { code: row.code })}
                    checked={row.active}
                    loading={saving === row.code}
                    disabled={saving !== null}
                    onChange={(active) => save(row, { active })}
                />
            ),
        },
        { title: t('admin.promocodes.expiresAt'), key: 'expiresAt', render: (row) => time(row.expiresAt) },
        { title: t('admin.promocodes.description'), dataIndex: 'description', key: 'description' },
        { title: t('admin.promocodes.created'), key: 'created_at', render: (row) => time(row.created_at, 'admin.promocodes.unknownDate') },
        {
            title: '',
            key: 'actions',
            render: (row) => (
                <Button size="small" disabled={saving !== null} onClick={() => setEditing(row)}>
                    {t('admin.promocodes.edit')}
                </Button>
            ),
        },
    ];

    return (
        <Space direction="vertical" style={{ width: '100%' }}>
            <Button type="primary" disabled={saving !== null} onClick={() => setEditing(null)}>{t('admin.promocodes.create')}</Button>
            {failed ? (
                <Alert
                    type="error"
                    showIcon
                    message={t('admin.promocodes.loadFailed')}
                    action={<Button onClick={load}>{t('common.retry')}</Button>}
                />
            ) : (
                <Table rowKey="code" dataSource={rows} columns={columns} loading={loading} pagination={{ pageSize: 20 }} size="small" scroll={{ x: 1100 }} />
            )}
            <Modal
                visible={editing !== undefined}
                title={editing ? t('admin.promocodes.editTitle', { code: editing.code }) : t('admin.promocodes.create')}
                onCancel={() => setEditing(undefined)}
                closable={saving === null}
                maskClosable={saving === null}
                keyboard={saving === null}
                className="promocode-editor"
                destroyOnClose
                getContainer={false}
                footer={[
                    <Button key="cancel" disabled={saving !== null} onClick={() => setEditing(undefined)}>{t('admin.cancel')}</Button>,
                    <Button key="save" type="primary" loading={saving !== null} onClick={() => form.submit()}>{t('admin.save')}</Button>,
                ]}
            >
                {editing !== undefined && (
                    <Form form={form} layout="vertical" initialValues={draftOf(editing)} preserve={false} onFinish={submit}>
                        {!editing && (
                            <>
                                <Form.Item name="code" label={t('admin.promocodes.code')} rules={[{ pattern: /^[A-Za-z0-9_-]{3,32}$/, required: true, message: t('admin.promocodes.codeInvalid') }]}>
                                    <Input maxLength={32} disabled={saving !== null} />
                                </Form.Item>
                                <Form.Item
                                    name="bonus"
                                    label={t('admin.promocodes.bonus')}
                                    rules={[{ validator: (_, value) => validIf(/^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 100000, t('admin.promocodes.bonusInvalid')) }]}
                                >
                                    <Input inputMode="decimal" disabled={saving !== null} />
                                </Form.Item>
                            </>
                        )}
                        <Form.Item
                            name="limit"
                            label={t('admin.promocodes.limit')}
                            rules={[{ validator: (_, value) => validIf(Number.isInteger(value) && value >= Math.max(1, editing ? editing.used : 0) && value <= MYSQL_INT_MAX, t('admin.promocodes.limitInvalid')) }]}
                        >
                            <InputNumber disabled={saving !== null} />
                        </Form.Item>
                        <Form.Item name="active" label={t('admin.promocodes.active')} valuePropName="checked">
                            <Switch aria-label={t('admin.promocodes.active')} disabled={saving !== null} />
                        </Form.Item>
                        <Form.Item
                            name="expiresAt"
                            label={t('admin.promocodes.expiresAt')}
                            extra={t('admin.promocodes.localTime')}
                            rules={[{ validator: (_, value) => validIf(!value || value === localTime(editing && editing.expiresAt) || new Date(value).getTime() > Date.now(), t('admin.promocodes.expiresAtInvalid')) }]}
                        >
                            <Input type="datetime-local" step={1} disabled={saving !== null} />
                        </Form.Item>
                        <Form.Item
                            name="description"
                            label={t('admin.promocodes.description')}
                            rules={[{ validator: (_, value) => validIf([...value].length <= 255, t('admin.promocodes.descriptionInvalid')) }]}
                        >
                            <Input.TextArea disabled={saving !== null} rows={3} />
                        </Form.Item>
                    </Form>
                )}
            </Modal>
        </Space>
    );
};

export default PromocodesTab;
