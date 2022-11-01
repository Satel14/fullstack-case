import React from 'react';
import { Layout } from 'antd';
import { GiftOutlined } from '@ant-design/icons';

const { Header } = Layout;

export default class HeaderSecond extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            // data: [testArticle[0]],
        };
    }

    render() {
        return (
            <Header className="headersecond">
                <div className="headersecond-stats">
                    <div className="headersecond-stats__opened" />
                    <div className="headersecond-stats__block">
                        <i>2222</i>
                        <span>Відкрито кейсів</span>
                    </div>
                </div>
                <div className="headersecond-stats">
                    <div className="headersecond-stats__users" />
                    <div className="headersecond-stats__block">
                        <i>3333</i>
                        <span>Користувачів</span>
                    </div>
                </div>
                <div className="headersecond-stats">
                    <div className="headersecond-stats__online" />
                    <div className="headersecond-stats__block">
                        <i>23</i>
                        <span>Виведено предметів</span>
                    </div>
                </div>
                <div className="headersecond-stats">
                    <div className="headersecond-stats__online" />
                    <div className="headersecond-stats__block">
                        <i>156</i>
                        <span>Онлайн</span>
                    </div>
                </div>
                <div className="headersecond-stats custom">
                    <GiftOutlined />
                    <div className="headersecond-stats__block">
                        <i>Бонуси</i>
                        <span>Розіграші, роздачі</span>
                    </div>
                </div>
            </Header>
        );
    }
}
