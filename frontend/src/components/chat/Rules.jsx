import React, {useState} from 'react';
import {Modal, Button} from 'antd';
import { useTranslation } from 'react-i18next';

export const Rules = () => {
    const { t } = useTranslation();
    const [isModalVisible, setModalVisible] = useState(false);

    const showModal = () => {
        setModalVisible(true);
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    return (
        <>
            <Button className="color-white small" onClick={showModal}>
                {t('rules.trigger')}
            </Button>
            <Modal
                title={t('rules.title')}
                open={isModalVisible}
                cancelText={t('rules.close')}
                okButtonProps={{ style: { display: 'none' } }}
                onCancel={handleCancel}
            >
                <p>{`— ${t('rules.r1')}`}</p>
                <p>{`- ${t('rules.r2')}`}</p>
                <p>{`- ${t('rules.r3')}`}</p>
                <p>{`- ${t('rules.r4')}`}</p>
                <p>{`- ${t('rules.r5')}`}</p>
                <p>{`- ${t('rules.r6')}`}</p>
                <p>{t('rules.r7')}</p>
            </Modal>
        </>
    );
};
