import React, { useState } from 'react';
import {
 Modal, Input, InputNumber, Button, Alert, Space,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { muteUser, unmuteUser } from '../../api/all/admin';
import openNotification from '../../components/mini/openNotification';
import { serverText } from '../../helpers/serverMessage';

const MuteModal = ({ user, onClose, onDone }) => {
    const { t, i18n } = useTranslation();
    const [duration, setDuration] = useState(15);
    const [reason, setReason] = useState('');
    const [reviewing, setReviewing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [lifting] = useState(() => new Date(user.user_mutedUntil).getTime() > Date.now());
    const ready = reason.trim() && (lifting || (Number.isInteger(duration) && duration >= 1 && duration <= 43200));

    const submit = async () => {
        setSubmitting(true);
        try {
            if (lifting) await unmuteUser(user.user_id, reason.trim());
            else await muteUser(user.user_id, duration, reason.trim());
            openNotification('success', t('admin.mute.done'), user.user_login);
            onDone();
        } catch (e) {
            openNotification('error', t('admin.mute.failed'), (e && e.error && serverText(t, e)) || t('common.serverError'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal
            open
            title={`${t(lifting ? 'admin.mute.lift' : 'admin.mute.action')} — ${user.user_login}`}
            onCancel={() => { if (!submitting) onClose(); }}
            footer={null}
            maskClosable={false}
            keyboard={!submitting}
            closable={!submitting}
            getContainer={false}
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                {lifting && <Alert message={t('admin.mute.current', { until: new Date(user.user_mutedUntil).toLocaleString(i18n && i18n.language) })} />}
                {!lifting && (
                    <>
                        <label htmlFor="admin-mute-duration">{t('admin.mute.duration')}</label>
                        <InputNumber
                            id="admin-mute-duration"
                            min={1}
                            max={43200}
                            precision={0}
                            value={duration}
                            disabled={submitting}
                            onChange={(value) => { setDuration(value); setReviewing(false); }}
                        />
                    </>
                )}
                <label htmlFor="admin-mute-reason">{t('admin.mute.reason')}</label>
                <Input
                    id="admin-mute-reason"
                    value={reason}
                    maxLength={255}
                    disabled={submitting}
                    onChange={(e) => { setReason(e.target.value); setReviewing(false); }}
                />
                {reviewing && <Alert type="warning" message={t('admin.mute.confirmTitle')} description={`${user.user_login} — ${reason.trim()}`} />}
                <Button disabled={!ready || reviewing || submitting} onClick={() => setReviewing(true)}>{t('admin.mute.review')}</Button>
                <Button type="primary" danger disabled={!reviewing || !ready} loading={submitting} onClick={submit}>{t('admin.mute.confirm')}</Button>
            </Space>
        </Modal>
    );
};

export default MuteModal;
