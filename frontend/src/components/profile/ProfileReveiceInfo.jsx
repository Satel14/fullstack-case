import React, { Component } from 'react';
import {
 Form, Input, Button, Card, Tooltip,
} from 'antd';
import { connect } from 'react-redux';
import { updateProfileField } from '../../store/actions/user';
import openNotification from '../mini/openNotification';

const mapDispatchToProps = (dispatch) => ({
  updateProfileField: (fieldName, fieldData) => dispatch(updateProfileField(fieldName, fieldData)),
});

const mapStateToProps = (state) => ({
  user: state.user,
});

class ProfileReceiveInfo extends Component {
  onFinish(e) {
    if (!e.receiveInfo) {
      openNotification('error', 'Помилка', 'Не залишайте поле пустим');
      return;
    }

    this.props.updateProfileField('receiveInfo', e.receiveInfo);
    openNotification('success', 'Збережено');
  }

  render() {
    const { receiveInfo } = this.props.user;
    return (
      <div>
        <Card
          type="inner"
          title="Інформація для виводу предметів"
          className="blockstyle-first receiveinfo"
          extra={(
            <Tooltip
              placement="top"
              title="Залишіть посилання на Steam або EpicID та зручний час для вас. Ця інформація буде надіслана трейдерам."
            >
              <span style={{ color: '#fff' }}>Що це?</span>
            </Tooltip>
          )}
        >
          <Form
            initialValues={{ remember: true }}
            onFinish={(e) => this.onFinish(e)}
            scrollToFirstError
            layout="inline"
          >
            <Form.Item name="receiveInfo">
              <Input.TextArea
                placeholder="Вкажіть ваш Steam або EpicId"
                defaultValue={receiveInfo}
                style={{ minHeight: '117px' }}
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="color-green">
                Зберегти
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ProfileReceiveInfo);
