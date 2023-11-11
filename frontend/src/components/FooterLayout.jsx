import React from 'react';
import { Layout } from 'antd';
import { Link } from 'react-router-dom';

const { Footer } = Layout;

const FooterLayout = () => (
    <Footer>
        <div className="leftblock">
            <div>2023 Case</div>
        </div>
        <div>
           На нашому сайт ви можете відкрити різні кейси CS:GO по самим вигідним цінам.
           Цей сайт захищений reCAPTCHA та Google Політика
           конфіденційності та Умови використання
        </div>
        <div className="rightblock">
            <Link to='/article/3'>Користувацька угода</Link>
            <Link to='/article/6'>Правила</Link>
            <Link to='/article/7'>Питання/відповідь</Link>
            <Link to='/article/9'>Відгуки</Link>
        </div>
    </Footer>
);

export default FooterLayout;
