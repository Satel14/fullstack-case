import React from "react";
import { Layout } from "antd";

const { Header } = Layout;

export default class HeaderSecond extends React.Component {
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
                        <i>156</i>
                        <span>Онлайн</span>
                    </div>
                </div>
            </Header>
        );
    }
}