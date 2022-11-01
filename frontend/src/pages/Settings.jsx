import React, { Component } from 'react';
// import testCase from '../data/testCase';
import {
    Card,
    Form,
    Input,
    Row,
    Col,
    Button,
    Divider,
} from 'antd';

const style = { padding: '8px 0' };
export default class Settings extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // case: testCase[0],
        };
    }

    render() {
        return (
            <div className="settingpage">
                <Divider orientation="left">
                    Horizontal
                </Divider>
                <Row glutter={16}>
                    <Col className="gutter-row" span={12}>
                        <div style={style}>
                            <Card
                                type="inner"
                                title="Промокод"
                                className="blockstyle-first"
                                extra={<a href="#">Де взяти промокод?</a>}
                            >
                                <Form
                                    layout="inline"
                                >
                                    <Form.Item name="co">
                                        <Input placeholder="Введіть код" />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type="primary" danger htmlType="submit">
                                            Використати
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </Card>
                        </div>
                    </Col>
                    <Col className="gutter-row" span={12}>
                        <div style={style}>
                            <Card
                                type="inner"
                                title="Промокод"
                                className="blockstyle-first"
                                extra={<a href="#">Де взяти промокод?</a>}
                            >
                                <Form
                                    layout="inline"
                                >
                                    <Form.Item name="co">
                                        <Input placeholder="Введіть код" />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type="primary" danger htmlType="submit">
                                            Використати
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </Card>
                        </div>
                    </Col>
                </Row>
            </div>
        );
    }
}
