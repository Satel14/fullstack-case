import React from 'react';
import { connect } from 'react-redux';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { logoutProfile } from '../store/actions/user';
import { SUPPORT_EMAIL } from '../config/publicInfo';

const mapDispatchToProps = (dispatch) => ({
    logoutProfile: () => dispatch(logoutProfile()),
});

const Banned = (props) => {
    const { t } = useTranslation();
    return (
        <div className="banned">
            <div>{t('banned.message')}</div>
            {SUPPORT_EMAIL && <div>{t('banned.appeal', { email: SUPPORT_EMAIL })}</div>}
            <div>
                <Button className="color-red" onClick={() => props.logoutProfile()}>
                    {t('banned.logout')}
                </Button>
            </div>
        </div>
    );
};

export default connect(null, mapDispatchToProps)(Banned);
