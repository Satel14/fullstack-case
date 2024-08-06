import React from 'react';
import {connect} from 'react-redux';
import {Button} from 'antd';
import {logoutProfile} from '../store/actions/user';

const mapDispatchToProps = (dispatch) => ({
    logoutProfile: () => dispatch(logoutProfile()),
})


const Banned = () => (
    <>
        <div className="banned">
            <div>Цей аккаунт забанений на сайті!</div>
            <div>
                <Button className="color-red" onClick={() => props.logoutProfile()}>
                    Вийти з аккаунта
                </Button>
            </div>
        </div>
    </>
)

export default connect(null, mapDispatchToProps)(Banned);
