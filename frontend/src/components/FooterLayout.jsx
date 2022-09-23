import React from 'react'
import { Layout } from "antd";

const { Footer } = Layout;
const FooterLayout = () => {
    return (
        <Footer>
            <div className='container'>
                <div className='logo'>
                    <div className='leftblock'>
                        <div>2022 Case</div>
                    </div>
                    <div>На нашому сайт ви можете відкрити різні кейси CS:GO по самим вигідним цінам.Цей сайт захищений reCAPTCHA та Google Політика
                        конфіденційності та Умови використання</div>
                </div>

                <div className='rightblock'>
                    <a>Користувацька угода</a>
                    <a>Контакти та коорпоративна інформація</a>
                    <a>Питання/відповідь</a>
                    <a>Відгуки</a>
                </div>
            </div>
        </Footer>
    )
}

export default FooterLayout