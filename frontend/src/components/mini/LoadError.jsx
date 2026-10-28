import React from 'react';
import { Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const LoadError = ({ onRetry }) => {
    const { t } = useTranslation();
    return (
        <div className="loaderror" role="alert">
            <p>{t('common.loadFailed')}</p>
            <Button icon={<ReloadOutlined />} onClick={onRetry}>{t('common.retry')}</Button>
        </div>
    );
};

export default LoadError;
