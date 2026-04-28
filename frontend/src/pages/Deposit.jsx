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
import Fade from 'react-reveal/Fade';
import H2A from '../components/mini/H2A';
import { itemInfoFetch } from '../store/actions/itemCache';
import { SUPPORT_EMAIL } from '../config/publicInfo.js';

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
});

const mapStateToProps = (state) => ({
    user: state.user,
    itemCache: state.itemCache,
});

class Deposit extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // tabActive: 'money',
        };

        this.getSettingsPage = this.getSettingsPage.bind(this);
    }

    getSettingsPage() {
        const { history } = this.props;
        history.push('/settings');
    }

    render() {
        const tabItems = [
            {
                key: 'money',
                label: 'Поповнити',
                children: (
                    <div className="depositpage-list">
                        <div className="notworking">Недоступно</div>

                        <div className="depositpage-list__payment">
                            <Form layout="vertical">
                                <Form.Item
                                    label="ВВЕДІТЬ СУМУ (UAH)"
                                >
                                    <Input
                                        size="large"
                                        prefix={<DollarOutlined className="site-form-item-icon" />}
                                    />
                                </Form.Item>

                                <Button
                                    type="primary"
                                    danger
                                    size="large"
                                    className="color-green"
                                    onClick={() => this.getSettingsPage()}
                                >
                                    Поповнити баланс
                                </Button>
                            </Form>
                        </div>

                        <div className="depositpage-list__paymentlist">
                            Для поповнення балансу ви будете перенаправлені на сайт
                            платіжної системи.
                            Баланс поповнюється миттєво, але якщо цього не
                            сталося протягом години, напишіть нам на пошту
                            {' '}
                            {SUPPORT_EMAIL}
                            , вказавши детальні дані платежу.
                        </div>
                    </div>
                ),
            },
            {
                key: 'history',
                label: 'Історія поповнень',
                children: (
                    <div className="depositpage-list">
                        <div className="notworking">Недоступно</div>
                    </div>
                ),
            },
        ];

        return (
            <div className="depositpage">
                <H2A title="Поповнення" subTitle="рахунку" />
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
                                        Використати промокод для поповнення
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

export default connect(mapStateToProps, mapDispatchToProps)(Deposit);
