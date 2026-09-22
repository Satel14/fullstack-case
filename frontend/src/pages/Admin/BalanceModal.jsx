import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import { adjustUserBalance } from '../../api/all/admin';

const MAX_DELTA = 1000000;

const parseDelta = (raw) => {
    const value = Number(raw);
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

    const submit = async () => {
        setSubmitting(true);
        try {
            await adjustUserBalance(user.user_id, parsedDelta, trimmedReason);
            onDone();
        } catch (e) {
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

            <label htmlFor="admin-balance-reason">{t('admin.balance.reason')}</label>
            <Input
                id="admin-balance-reason"
                aria-label={t('admin.balance.reason')}
                value={reason}
                onChange={(e) => { setReason(e.target.value); setReviewing(false); }}
            />

            {reviewing && (
                <Alert
                    type="warning"
                    showIcon
                    message={t('admin.balance.confirmTitle')}
                    description={`${user ? user.user_login : ''}: ${parsedDelta > 0 ? '+' : ''}${parsedDelta} — ${trimmedReason}`}
                />
            )}

            {!reviewing && (
                <Button type="primary" disabled={!ready} onClick={() => setReviewing(true)}>
                    {t('admin.balance.review')}
                </Button>
            )}

            {reviewing && (
                <Button type="primary" danger loading={submitting} onClick={submit}>
                    {t('admin.balance.confirm')}
                </Button>
            )}
        </Modal>
    );
};

export default BalanceModal;
