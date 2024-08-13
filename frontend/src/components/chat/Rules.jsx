import React, {useState} from 'react';
import {Modal, Button} from 'antd';

const Rules = () => {
    const [isModalVisible, setModalVisible] = useState(false);

    const showModal = () => {
        setModalVisible(true);
    }

    const handleCancel = () => {
        setModalVisible(false);
    }

    return (
        <>
        <Button>

        </Button>
        </>
    )
}