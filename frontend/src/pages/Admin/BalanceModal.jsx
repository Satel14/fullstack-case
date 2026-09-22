import React, { useState, useEffect } from 'react';
import {
    Modal, Input, Button, Alert, Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { adjustUserBalance } from '../../api/all/admin';
import openNotification from '../../components/mini/openNotification';

const MAX_DELTA = 1000000;

const parseDelta = (raw) => {
    const normalised = String(raw).trim().replace(',', '.');
    if (normalised === '') {
        return null;
    }
    const value = Number(normalised);
    if (!Number.isFinite(value) || value === 0) {
        return null;
    }
    if (Math.abs(value) > MAX_DELTA) {
        return null;
    }
    if (Math.round(value * 100) / 100 !== value) {
        return null;
    }
    return value;
};

const BalanceModal = ({ user, visible, onClose, onDone }) => {
    const { t } = useTranslation();
    const [delta, setDelta] = useState('');
    const [reason, setReason] = useState('');
    const [reviewing, setReviewing] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (visible) {
            setDelta('');
            setReason('');
            setReviewing(false);
        }
    }, [visible]);

    const parsedDelta = parseDelta(delta);
    const trimmedReason = reason.trim();
    const ready = parsedDelta !== null && trimmedReason.length > 0;
    const deltaInvalid = delta.trim().length > 0 && parsedDelta === null;
    const reasonInvalid = reason.length > 0 && trimmedReason.length === 0;

    const submit = async () => {
        setSubmitting(true);
        try {
            const res = await adjustUserBalance(user.user_id, parsedDelta, trimmedReason);
            const balance = res && res.balance !== null && res.balance !== undefined
                ? Number(res.balance).toFixed(2)
                : null;
            openNotification(
                'success',
                t('admin.balance.done'),
                balance === null
                    ? user.user_login
                    : t('admin.balance.newBalance', { login: user.user_login, balance }),
            );
            onDone();
        } catch (e) {
            const message = e && e.error && e.message ? e.message : t('common.serverError');
            openNotification('error', t('admin.balance.failed'), message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            visible={visible}
            onCancel={onClose}
            title={`${t('admin.balance.title')} — ${user ? user.user_login : ''}`}
            footer={null}
            destroyOnClose
            getContainer={false}
        >
            <label htmlFor="admin-balance-delta">{t('admin.balance.delta')}</label>
            <Input
                id="admin-balance-delta"
                aria-label={t('admin.balance.delta')}
                value={delta}
                onChange={(e) => { setDelta(e.target.value); setReviewing(false); }}
            />
            {deltaInvalid && (
                <Typography.Text role="alert" type="danger">
                    {t('admin.balance.deltaInvalid')}
                </Typography.Text>
            )}

            <label htmlFor="admin-balance-reason">{t('admin.balance.reason')}</label>
            <Input
                id="admin-balance-reason"
                aria-label={t('admin.balance.reason')}
                value={reason}
                onChange={(e) => { setReason(e.target.value); setReviewing(false); }}
            />
            {reasonInvalid && (
                <Typography.Text role="alert" type="danger">
                    {t('admin.balance.reasonRequired')}
                </Typography.Text>
            )}

            {reviewing && (
                <Alert
                    type="warning"
                    showIcon
                    message={t('admin.balance.confirmTitle')}
                    description={`${user ? user.user_login : ''}: ${parsedDelta > 0 ? '+' : ''}${parsedDelta} — ${trimmedReason}`}
                />
            )}

            <Button type="primary" disabled={!ready || reviewing} onClick={() => setReviewing(true)}>
                {t('admin.balance.review')}
            </Button>

            <Button
                type="primary"
                danger
                disabled={!reviewing}
                loading={submitting}
                onClick={submit}
            >
                {t('admin.balance.confirm')}
            </Button>
        </Modal>
    );
};

export default BalanceModal;
