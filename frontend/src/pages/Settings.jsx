import React, { Component } from 'react';
import {
    Form,
    Input,
    Row,
    Col,
    Button,
} from 'antd';
import { connect } from 'react-redux';
import {
    DollarOutlined,
} from '@ant-design/icons';
import H2A from '../components/mini/H2A';
import ProfileAvatar from '../components/profile/ProfileAvatar';
import Promocode from '../components/profile/Promocode';
import InventoryHistory from '../components/inventory/InventoryHistory';
import ProfileReceiveInfo from '../components/profile/ProfileReveiceInfo';
import { resetProfile } from '../api/all/profile';

const mapStateToProps = (state) => ({
    user: state.user,
});

const resetProfileHandle = async () => {
    await resetProfile().then(() => {
        window.location.reload();
        return null;
    });
};

class Settings extends Component {
    constructor(props) {
        super(props);
        this.getDepositePage = this.getDepositePage.bind(this);
    }

    getDepositePage() {
        const { history } = this.props;
        history.push('/deposit');
    }

    render() {
        const { user } = this.props;
        return (
            <div className="settingspage">
                <H2A title="Налаштування профілю" subTitle="" />
                <Row gutter={16} style={{ marginTop: '30px' }}>
                    <Col className="gutter-row" span={12}>
                        <Form
                            labelCol={{ span: 6 }}
                            wrapperCol={{ span: 17 }}
                            layout="horizontal"
                        >
                            <Form.Item
                                name="nickname"
                                label="Логін"
                            >
                                <Input defaultValue={user.login} disabled />
                            </Form.Item>

                            <Form.Item
                                name="email"
                                label="Пошта"
                            >
                                <Input defaultValue={user.email} disabled />
                            </Form.Item>

                            <Form.Item
                                name="balance"
                                label="Баланс"
                            >
                                <Input defaultValue={user.balance} disabled style={{ maxWidth: '120px' }} />

                                <Button type="primary" icon={<DollarOutlined />} className="color-green" onClick={() => this.getDepositePage()}>
                                    Поповнити
                                </Button>

                            </Form.Item>

                            <Form.Item
                                name="obnulenie"
                                label="Скинути профіль"
                            >

                                <Button type="primary" className="color-green" onClick={() => resetProfileHandle()}>
                                    Обнулитися
                                </Button>

                            </Form.Item>

                            <Form.Item label="Змінити аватар">
                                <ProfileAvatar />
                            </Form.Item>

                        </Form>
                    </Col>
                    <Col className="gutter-row" span={11}>
                        <div>
                            <Promocode />
                        </div>
                        <br />
                        <div>
                            <ProfileReceiveInfo />
                        </div>
                    </Col>
                </Row>

                <H2A title="Історія інвентаря" subTitle="" />
                <Row gutter={16} style={{ marginTop: '20px' }}>
                    <Col className="gutter-row" span={24}>
                        <InventoryHistory id={user.id} />
                    </Col>
                </Row>
            </div>

        );
    }
}

export default connect(mapStateToProps, null)(Settings);
