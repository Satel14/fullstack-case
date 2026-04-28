import React, { Component } from 'react';
import { Radio } from 'antd';
import { connect } from 'react-redux';
import images from '../../data/avatars';
import { updateProfileField } from '../../store/actions/user';

const mapDispatchToProps = (dispatch) => ({
    updateProfileField: (fieldName, fieldData) => dispatch(updateProfileField(fieldName, fieldData)),
});

const mapStateToProps = (state) => ({
    user: state.user,
});

class ProfileAvatar extends Component {
    updateProfileField(fieldName, fieldData) {
        // eslint-disable-next-line react/destructuring-assignment
        this.props.updateProfileField(fieldName, fieldData);
    }

    render() {
        const { avatar } = this.props.user;
        return (
            <Radio.Group defaultValue={avatar} buttonStyle="solid">
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

export default connect(mapStateToProps, mapDispatchToProps)(ProfileAvatar);
