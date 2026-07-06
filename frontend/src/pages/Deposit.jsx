import React, { Component } from 'react';
import {
    Row,
    Col,
    Tabs,
    Input,
    Button,
    Form,
} from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import Fade from 'react-reveal/Fade';
import H2A from '../components/mini/H2A';
import Loader from '../components/mini/Loader';
import openNotification from '../components/mini/openNotification';
import { getDepositHistory } from '../api/all/profile';
import { SUPPORT_EMAIL } from '../config/publicInfo.js';

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 100000;

const mapStateToProps = (state) => ({
    user: state.user,
});

const formatDate = (value) => {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    return date.toLocaleString('uk-UA');
};

class Deposit extends Component {
    constructor(props) {
        super(props);
        this.state = {
            amount: '',
            deposits: [],
            loadingHistory: true,
        };

        this.goToPayment = this.goToPayment.bind(this);
    }

    componentDidMount() {
        this.loadHistory();
    }

    async loadHistory() {
        try {
            const resp = await getDepositHistory();
            this.setState({
                deposits: Array.isArray(resp && resp.data) ? resp.data : [],
                loadingHistory: false,
            });
        } catch (e) {
            this.setState({ deposits: [], loadingHistory: false });
        }
    }

    goToPayment() {
        const { t } = this.props;
        const amount = Number(this.state.amount);

        if (!Number.isInteger(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
            openNotification(
                'error',
                t('deposit.invalidTitle'),
                t('deposit.invalidText', { min: MIN_AMOUNT, max: MAX_AMOUNT }),
            );
            return;
        }

        this.props.history.push('/payment', { amount });
    }

    getSettingsPage() {
        const { history } = this.props;
        history.push('/settings');
    }

    render() {
        const { amount, deposits, loadingHistory } = this.state;
        const { t } = this.props;

        const tabItems = [
            {
                key: 'money',
                label: t('deposit.tabTopUp'),
                children: (
                    <div className="depositpage-list">
                        <div className="depositpage-list__payment">
                            <Form layout="vertical">
                                <Form.Item label={t('deposit.amountLabel')}>
                                    <Input
                                        size="large"
                                        type="number"
                                        min={MIN_AMOUNT}
                                        max={MAX_AMOUNT}
                                        value={amount}
                                        onChange={(e) => this.setState({ amount: e.target.value })}
                                        prefix={<DollarOutlined className="site-form-item-icon" />}
                                    />
                                </Form.Item>

                                <Button
                                    type="primary"
                                    danger
                                    size="large"
                                    className="color-green"
                                    onClick={this.goToPayment}
                                >
                                    {t('deposit.submit')}
                                </Button>
                            </Form>
                        </div>

                        <div className="depositpage-list__paymentlist">
                            {t('deposit.info', { email: SUPPORT_EMAIL })}
                        </div>
                    </div>
                ),
            },
            {
                key: 'history',
                label: t('deposit.tabHistory'),
                children: (
                    <div className="depositpage-list">
                        {loadingHistory && <Loader />}
                        {!loadingHistory && deposits.length === 0 && (
                            <div style={{ textAlign: 'center', opacity: 0.8 }}>
                                {t('deposit.historyEmpty')}
                            </div>
                        )}
                        {!loadingHistory && deposits.length > 0 && (
                            <div className="depositpage-history">
                                {deposits.map((item) => (
                                    <div className="depositpage-history__item" key={item.history_id}>
                                        <span>{formatDate(item.created_at)}</span>
                                        <span>{t('deposit.historyAmount', { amount: item.history_change })}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ),
            },
        ];

        return (
            <div className="depositpage">
                <H2A title={t('deposit.title')} subTitle={t('deposit.subtitle')} />
                <Fade>
                    <Row gutter={16}>
                        <Col className="gutter-row" span={24}>
                            <Tabs
                                defaultActiveKey="money"
                                tabBarExtraContent={(
                                    <Button
                                        type="primary"
                                        danger
                                        className="color-orange"
                                        onClick={() => this.getSettingsPage()}
                                    >
                                        {t('deposit.promocodeBtn')}
                                    </Button>
                                )}
                                items={tabItems}
                            />
                        </Col>
                    </Row>
                </Fade>
            </div>
        );
    }
}

export default connect(mapStateToProps, null)(withTranslation()(Deposit));
