import React from 'react';
import { Layout } from 'antd';
import { Link } from 'react-router-dom';

const { Footer } = Layout;
const currentYear = new Date().getFullYear();

const FooterLayout = () => (
    <Footer>
        <div className="leftblock">
            <div>{`${currentYear} Case`}</div>
        </div>
        <div>
            Відкривайте кейси CS2/CS:GO на прозорих умовах та з історією дій у профілі.
            Цей сайт захищений reCAPTCHA, також діють Політика конфіденційності
            та Умови використання Google.
        </div>
        <div className="rightblock">
            <Link to="/article/3">Користувацька угода</Link>
            <Link to="/article/6">Правила сервісу</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/article/9">Відгуки користувачів</Link>
        </div>
    </Footer>
);

export default FooterLayout;
