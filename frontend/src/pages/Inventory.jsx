import React, { Component } from 'react';
import { Card, Form, Input, Button, Switch, Select, Avatar, Upload, Divider } from 'antd';
import { UserOutlined, UploadOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { connect } from 'react-redux';
import openNotification from '../components/mini/openNotification';

const { Option } = Select;

const mapStateToProps = (state) => ({
    user: state.user,
});

class Inventory extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
        };
    }

    onFinish = (values) => {
        console.log('Settings updated:', values);
        openNotification('success', 'Успіх', 'Налаштування збережено');
    };

    onPasswordChange = (values) => {
        console.log('Password change:', values);
        openNotification('success', 'Успіх', 'Пароль змінено');
    };

    render() {
        const { user } = this.props;
        const { loading } = this.state;

        return (
            <div className="inventorypage">
                <h1 className="title">Налаштування профілю</h1>

                <Card title="Основна інформація" className="blockstyle-first" style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                        <Avatar
                            size={80}
                            icon={<UserOutlined />}
                            style={{
                                backgroundImage: user.avatar
                                    ? `url(/img/avatars/${user.avatar}.png)`
                                    : '',
                                backgroundSize: 'cover',
                            }}
                        />
                        <div style={{ marginLeft: 20 }}>
                            <h3>{user.login || 'Користувач'}</h3>
                            <Upload>
                                <Button icon={<UploadOutlined />}>Змінити аватар</Button>
                            </Upload>
                        </div>
                    </div>

                    <Form
                        layout="vertical"
                        onFinish={this.onFinish}
                        initialValues={{
                            email: user.email || '',
                            notifications: true,
                            soundEnabled: true,
                        }}
                    >
                        <Form.Item
                            label="Email"
                            name="email"
                            rules={[
                                { required: true, message: 'Введіть email' },
                                { type: 'email', message: 'Невірний формат email' },
                            ]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="email@example.com" />
                        </Form.Item>

                        <Form.Item label="Аватар" name="avatar">
                            <Select 
                                placeholder="Виберіть аватар"
                                dropdownStyle={{ backgroundColor: '#1f1f1f' }}
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                                    <Option key={num} value={num}>
                                        <div style={{ display: 'flex', alignItems: 'center', color: '#fff' }}>
                                            <Avatar
                                                src={`/img/avatars/${num}.png`}
                                                size="small"
                                                style={{ marginRight: 10 }}
                                            />
                                            <span style={{ color: '#fff' }}>Аватар {num}</span>
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            label="Сповіщення"
                            name="notifications"
                            valuePropName="checked"
                        >
                            <Switch />
                        </Form.Item>

                        <Form.Item label="Звук" name="soundEnabled" valuePropName="checked">
                            <Switch />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                className="color-skyblue"
                            >
                                Зберегти зміни
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>

                <Card title="Зміна пароля" className="blockstyle-first">
                    <Form layout="vertical" onFinish={this.onPasswordChange}>
                        <Form.Item
                            label="Старий пароль"
                            name="oldPassword"
                            rules={[{ required: true, message: 'Введіть старий пароль' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>

                        <Form.Item
                            label="Новий пароль"
                            name="newPassword"
                            rules={[
                                { required: true, message: 'Введіть новий пароль' },
                                { min: 6, message: 'Мінімум 6 символів' },
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>

                        <Form.Item
                            label="Підтвердіть пароль"
                            name="confirmPassword"
                            dependencies={['newPassword']}
                            rules={[
                                { required: true, message: 'Підтвердіть пароль' },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('newPassword') === value) {
                                            return Promise.resolve();
                                        }
                                        return Promise.reject(
                                            new Error('Паролі не співпадають')
                                        );
                                    },
                                }),
                            ]}
                        >
                            <Input.Password prefix={<LockOutlined />} />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" className="color-pink">
                                Змінити пароль
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </div>
        );
    }
}

export default connect(mapStateToProps, null)(Inventory);

