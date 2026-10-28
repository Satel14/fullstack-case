import React, { Component } from 'react';
import {
    Row,
    Col,
    Tabs,
    Input,
    Button,
    Form,
} from 'antd';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import Fade from 'react-reveal/Fade';
import H2A from '../components/mini/H2A';
import Loader from '../components/mini/Loader';
import LoadError from '../components/mini/LoadError';
import openNotification from '../components/mini/openNotification';
import { getDepositHistory } from '../api/all/profile';

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
            historyFailed: false,
        };

        this.goToPayment = this.goToPayment.bind(this);
    }

    componentDidMount() {
        this.mounted = true;
        this.loadHistory();
    }

    componentWillUnmount() {
        this.mounted = false;
    }

    getPromocodePage() {
        const { history } = this.props;
        history.push('/promocode');
    }

    async loadHistory() {
        this.setState({ loadingHistory: true, historyFailed: false });
        try {
            const resp = await getDepositHistory();
            if (this.mounted) {
                this.setState({
                    deposits: Array.isArray(resp && resp.data) ? resp.data : [],
                    loadingHistory: false,
                });
            }
        } catch (e) {
            if (this.mounted) {
                this.setState({ deposits: [], loadingHistory: false, historyFailed: true });
            }
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

    render() {
        const {
            amount, deposits, loadingHistory, historyFailed,
        } = this.state;
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
                                        prefix="₴"
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
                            {t('deposit.info')}
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
                        {!loadingHistory && historyFailed && <LoadError onRetry={() => this.loadHistory()} />}
                        {!loadingHistory && !historyFailed && deposits.length === 0 && (
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
                                        onClick={() => this.getPromocodePage()}
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
