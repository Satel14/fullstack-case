import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert, Button, Input, InputNumber, Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { getSaleRate, updateSaleRate } from '../../api/all/admin';
import openNotification from '../../components/mini/openNotification';

const MIN_RATE = 0.0001;
const MAX_RATE = 1;
const AT_MOST_FOUR_DECIMALS = /^\d+(?:\.\d{1,4})?$/;

const validRate = (value) => typeof value === 'number'
    && value >= MIN_RATE
    && value <= MAX_RATE
    && AT_MOST_FOUR_DECIMALS.test(String(value));

const SettingsTab = () => {
    const { t } = useTranslation();
    const [rate, setRate] = useState(null);
    const [reason, setReason] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setFailed(false);
        try {
            const res = await getSaleRate();
            setRate(res.data.rate);
            setLoaded(true);
        } catch (e) {
            setFailed(true);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        setSaving(true);
        try {
            const res = await updateSaleRate(rate, reason.trim());
            setRate(res.data.rate);
            setReason('');
            openNotification('success', t('admin.settings.saved'), String(res.data.rate));
        } catch (e) {
            const message = e && e.error && e.message ? e.message : t('common.serverError');
            openNotification('error', t('admin.settings.saveFailed'), message);
        } finally {
            setSaving(false);
        }
    };

    if (failed) {
        return <Alert type="error" showIcon message={t('admin.settings.loadFailed')} />;
    }

    return (
        <div className="admin-settings">
            <label htmlFor="admin-sale-rate">{t('admin.settings.saleRate')}</label>
            <InputNumber
                id="admin-sale-rate"
                min={MIN_RATE}
                max={MAX_RATE}
                step={0.01}
                value={rate}
                onChange={setRate}
                disabled={!loaded || saving}
            />
            <Typography.Paragraph type="secondary">{t('admin.settings.saleRateHint')}</Typography.Paragraph>
            <label htmlFor="admin-sale-rate-reason">{t('admin.settings.reason')}</label>
            <Input
                id="admin-sale-rate-reason"
                value={reason}
                maxLength={255}
                onChange={(e) => setReason(e.target.value)}
                disabled={!loaded || saving}
            />
            <Button type="primary" loading={saving} disabled={!loaded || !validRate(rate)} onClick={save}>
                {t('admin.save')}
            </Button>
        </div>
    );
};

export default SettingsTab;
