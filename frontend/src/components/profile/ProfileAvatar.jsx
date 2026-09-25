import React, { Component } from 'react';
import { Radio } from 'antd';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import images from '../../data/avatars';
import { updateProfileField } from '../../store/actions/user';
import openNotification from '../mini/openNotification';

const mapDispatchToProps = (dispatch) => ({
    updateProfileField: (fieldName, fieldData) => dispatch(updateProfileField(fieldName, fieldData)),
});

const mapStateToProps = (state) => ({
    user: state.user,
});

class ProfileAvatar extends Component {
    async updateProfileField(fieldName, fieldData) {
        const { t } = this.props;
        try {
            // eslint-disable-next-line react/destructuring-assignment
            await this.props.updateProfileField(fieldName, fieldData);
        } catch (error) {
            openNotification('error', t('common.error'), t('settings.avatarError'));
        }
    }

    render() {
        const { avatar } = this.props.user;
        return (
            <Radio.Group value={avatar} buttonStyle="solid">
                {images.map((item) => (
                    <Radio.Button
                        value={item.id}
                        onClick={() => this.updateProfileField('avatar', item.id)}
                        className="radio-avatar"
                        key={`avatar${item.id}`}
                    >
                        <img src={item.url} alt={`${item.id} avatar`} />
                    </Radio.Button>
                ))}
            </Radio.Group>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(ProfileAvatar));
