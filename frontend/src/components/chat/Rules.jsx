import React, {useState} from 'react';
import {Modal, Button} from 'antd';

export const Rules = () => {
    const [isModalVisible, setModalVisible] = useState(false);

    const showModal = () => {
        setModalVisible(true);
    };

    const handleCancel = () => {
        setModalVisible(false);
    };

    return (
        <>
            <Button className="color-white small" onClick={showModal}>
                Правила
            </Button>
            <Modal
                title="ПРАВИЛА ЧАТУ"
                open={isModalVisible}
                cancelText="Закрити"
                okButtonProps={{ style: { display: 'none' } }}
                onCancel={handleCancel}
            >
                <p>
                    — Заборонено використовувати в нікнеймі назву або посилання, що ведуть на
                    сторонній сайт.
                </p>
                <p>- Заборонено рекламувати канали Youtube / Twitch / Discord.</p>
                <p>- Заборонено ображати інших учасників чату / сайту.</p>
                <p>
                    - Заборонено згадування платіжних реквізитів з метою жебрацтва.
                </p>
                <p>
                    - Заборонено розповсюджувати URL посилання та промо-коди (крім
                    Адміністрації та Модераторів).
                </p>
                <p>- Заборонено спамити повідомлення в чат по одному символу.</p>.
                <p>
                    Будь-який учасник сайту/чату, повинен з повагою ставиться до всіх без
                    винятку учасників.
                </p>
            </Modal>
        </>
    );
};
