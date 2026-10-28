import React from 'react';
import { Collapse } from 'antd';
import Fade from 'react-reveal/Fade';
import { useTranslation } from 'react-i18next';
import H2A from '../components/mini/H2A';
import { SUPPORT_EMAIL } from '../config/publicInfo.js';

const { Panel } = Collapse;

const Faq = () => {
    const { t } = useTranslation();

    const answer = (n) => {
        const text = t(`faq.q${n}.answer`);
        return n === 4 && SUPPORT_EMAIL ? `${text} ${t('faq.q4.email', { email: SUPPORT_EMAIL })}` : text;
    };

    const faqItems = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
        key: String(n),
        question: t(`faq.q${n}.question`),
        answer: answer(n),
    }));

    return (
        <div className="faqpage">
            <H2A title={t('faq.title')} subTitle={t('faq.subtitle')} />
            <Fade>
                <div className="faqpage-content">
                    <Collapse accordion>
                        {faqItems.map((item) => (
                            <Panel header={item.question} key={item.key}>
                                <p>{item.answer}</p>
                            </Panel>
                        ))}
                    </Collapse>
                </div>
            </Fade>
        </div>
    );
};

export default Faq;
