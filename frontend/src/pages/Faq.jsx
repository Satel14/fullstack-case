import React from 'react';
import { Collapse } from 'antd';
import Fade from 'react-reveal/Fade';
import H2A from '../components/mini/H2A';
import { SUPPORT_EMAIL } from '../config/publicInfo.js';

const { Panel } = Collapse;

const faqItems = [
    {
        key: '1',
        question: 'Як почати користуватися сайтом?',
        answer: 'Натисніть "Увійти", авторизуйтеся та поверніться на головну сторінку. Після входу стане доступний профіль, депозит і відкриття кейсів.',
    },
    {
        key: '2',
        question: 'Як поповнити баланс?',
        answer: 'Перейдіть на сторінку "Поповнити" та виберіть суму. Якщо платіж не зарахувався протягом години, зверніться в підтримку.',
    },
    {
        key: '3',
        question: 'Що робити, якщо предмет не з\'явився в інвентарі?',
        answer: 'Оновіть сторінку та перевірте історію інвентаря. Якщо проблема залишилась, напишіть у підтримку з вашим ID та часом відкриття кейсу.',
    },
    {
        key: '4',
        question: 'Як зв\'язатися з підтримкою?',
        answer: `Напишіть нам на ${SUPPORT_EMAIL}. Додайте деталі проблеми: логін, час події та, за можливості, скриншот.`,
    },
    {
        key: '5',
        question: 'Чи можна використовувати промокоди?',
        answer: 'Так, промокоди можна ввести в налаштуваннях профілю. Після активації бонус зараховується автоматично.',
    },
];

const Faq = () => (
    <div className="faqpage">
        <H2A title="FAQ" subTitle="питання та відповіді" />
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

export default Faq;
