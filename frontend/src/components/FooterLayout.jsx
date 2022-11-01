import React from 'react';
import { Layout } from 'antd';

const { Footer } = Layout;

const FooterLayout = () => (
    <Footer>
        <div className="logo">
            <div className="leftblock">
                <div>2022 Case</div>
            </div>
            <div>
                На нашому сайт ви можете відкрити різні кейси CS:GO по самим вигідним цінам.
                Цей сайт захищений reCAPTCHA та Google Політика
                конфіденційності та Умови використання
            </div>
        </div>
        <div className="rightblock">
            <a href="/">Користувацька угода</a>
            <a href="/">Контакти та коорпоративна інформація</a>
            <a href="/">Питання/відповідь</a>
            <a href="/">Відгуки</a>
        </div>
    </Footer>
);

export default FooterLayout;
