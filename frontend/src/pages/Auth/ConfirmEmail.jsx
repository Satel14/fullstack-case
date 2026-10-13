import React, { useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { confirmEmailFetch } from '../../store/actions/user';
import openNotification from '../../components/mini/openNotification';

const ConfirmEmail = () => {
    const { t } = useTranslation();
    const history = useHistory();
    const dispatch = useDispatch();
    const token = new URLSearchParams(useLocation().search).get('token');
    const [loading, setLoading] = useState(false);
    const [failure, setFailure] = useState('');

    if (!token) {
        return (
            <div className="loginpage">
                <h1 className="title">{t('auth.confirm.title')}</h1>
                <p>{t('auth.confirm.missingToken')}</p>
                <Link to="/registration">{t('auth.confirm.toRegister')}</Link>
            </div>
        );
    }

    const onConfirm = async () => {
        setLoading(true);
        try {
            await dispatch(confirmEmailFetch(token));
            openNotification('success', t('auth.confirm.successTitle'));
            history.push('/');
        } catch (e) {
            setFailure((e && e.message) || t('common.serverError'));
            setLoading(false);
        }
    };

    return (
        <div className="loginpage">
            <h1 className="title">{t('auth.confirm.title')}</h1>
            {failure ? (
                <>
                    <p>{failure}</p>
                    <p>
                        <Link to="/registration">{t('auth.confirm.toRegister')}</Link>
                        {' · '}
                        <Link to="/login">{t('auth.confirm.toLogin')}</Link>
                    </p>
                </>
            ) : (
                <>
                    <p>{t('auth.confirm.intro')}</p>
                    <Button type="primary" loading={loading} onClick={onConfirm}>{t('auth.confirm.submit')}</Button>
                </>
            )}
        </div>
    );
};

export default ConfirmEmail;
