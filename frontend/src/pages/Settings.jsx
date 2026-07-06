import React, { Component } from 'react';
import {
    Form,
    Input,
    Row,
    Col,
    Button,
} from 'antd';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import {
    DollarOutlined,
} from '@ant-design/icons';
import H2A from '../components/mini/H2A';
import ProfileAvatar from '../components/profile/ProfileAvatar';
import Promocode from '../components/profile/Promocode';
import InventoryHistory from '../components/inventory/InventoryHistory';
import ProfileReceiveInfo from '../components/profile/ProfileReceiveInfo';
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
        const { user, t } = this.props;
        return (
            <div className="settingspage">
                <H2A title={t('settings.title')} subTitle="" />
                <Row gutter={16} style={{ marginTop: '30px' }}>
                    <Col className="gutter-row" span={12}>
                        <Form
                            labelCol={{ span: 6 }}
                            wrapperCol={{ span: 17 }}
                            layout="horizontal"
                        >
                            <Form.Item
                                name="nickname"
                                label={t('settings.login')}
                            >
                                <Input defaultValue={user.login} disabled />
                            </Form.Item>

                            <Form.Item
                                name="email"
                                label={t('settings.email')}
                            >
                                <Input defaultValue={user.email} disabled />
                            </Form.Item>

                            <Form.Item
                                name="balance"
                                label={t('settings.balance')}
                            >
                                <Input defaultValue={user.balance} disabled style={{ maxWidth: '120px' }} />

                                <Button type="primary" icon={<DollarOutlined />} className="color-green" onClick={() => this.getDepositePage()}>
                                    {t('settings.topUp')}
                                </Button>

                            </Form.Item>

                            <Form.Item
                                name="obnulenie"
                                label={t('settings.resetLabel')}
                            >

                                <Button type="primary" className="color-green" onClick={() => resetProfileHandle()}>
                                    {t('settings.resetBtn')}
                                </Button>

                            </Form.Item>

                            <Form.Item label={t('settings.changeAvatar')}>
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

                <H2A title={t('settings.inventoryHistory')} subTitle="" />
                <Row gutter={16} style={{ marginTop: '20px' }}>
                    <Col className="gutter-row" span={24}>
                        <InventoryHistory id={user.id} />
                    </Col>
                </Row>
            </div>

        );
    }
}

export default connect(mapStateToProps, null)(withTranslation()(Settings));
