import React, { useState } from 'react';
import { Button } from 'antd';
import { Redirect } from 'react-router-dom';
import { LockOutlined } from '@ant-design/icons';
import Fade from 'react-reveal/Fade';
import { connect } from 'react-redux';
import { useTranslation } from 'react-i18next';
import H2A from '../components/mini/H2A';
import openNotification from '../components/mini/openNotification';
import { depositBalance } from '../api/all/profile';
import { updateBalance } from '../store/actions/user';

const PaymentGateway = (props) => {
    const { t } = useTranslation();
    const { history, location } = props;
    const amount = location && location.state ? location.state.amount : null;
    const [processing, setProcessing] = useState(false);

    if (!amount) {
        return <Redirect to="/deposit" />;
    }

    const onPay = async () => {
        setProcessing(true);
        try {
            const result = await depositBalance(amount);
            if (result && result.status === 200) {
                props.updateBalance(result.balance);
                if (window.HeaderSecond) {
                    window.HeaderSecond.changeBalance(result.balance);
                }
                openNotification('success', t('payment.successTitle'), t('payment.successText', { amount }));
                history.push('/deposit');
                return;
            }
            openNotification('error', t('payment.errorTitle'), t('payment.errorText'));
            setProcessing(false);
        } catch (e) {
            openNotification('error', t('payment.errorTitle'), t('payment.errorText'));
            setProcessing(false);
        }
    };

    const onCancel = () => {
        openNotification('info', t('payment.cancelTitle'), t('payment.cancelText'));
        history.push('/deposit');
    };

    return (
        <div className="paymentpage">
            <H2A title={t('payment.title')} subTitle={t('payment.subtitle')} />
            <Fade>
                <div className="paymentpage-card">
                    <div className="paymentpage-card__icon">
                        <LockOutlined />
                    </div>
                    <div className="paymentpage-card__amount">
                        {t('payment.amount', { amount })}
                    </div>
                    <div className="paymentpage-card__note">
                        {t('payment.note')}
                    </div>
                    <div className="paymentpage-card__actions">
                        <Button
                            type="primary"
                            size="large"
                            className="color-green"
                            loading={processing}
                            onClick={onPay}
                        >
                            {t('payment.pay')}
                        </Button>
                        <Button
                            size="large"
                            className="color-grey"
                            disabled={processing}
                            onClick={onCancel}
                        >
                            {t('payment.cancel')}
                        </Button>
                    </div>
                </div>
            </Fade>
        </div>
    );
};

const mapDispatchToProps = (dispatch) => ({
    updateBalance: (balance) => dispatch(updateBalance(balance)),
});

export default connect(null, mapDispatchToProps)(PaymentGateway);
