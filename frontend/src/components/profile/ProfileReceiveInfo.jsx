import React, { Component } from 'react';
import {
 Form, Input, Button, Card, Tooltip,
} from 'antd';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
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
    const { t } = this.props;
    if (!e.receiveInfo) {
      openNotification('error', t('receiveInfo.errorTitle'), t('receiveInfo.emptyError'));
      return;
    }

    this.props.updateProfileField('receiveInfo', e.receiveInfo);
    openNotification('success', t('receiveInfo.savedTitle'));
  }

  render() {
    const { receiveInfo } = this.props.user;
    const { t } = this.props;
    return (
      <div>
        <Card
          type="inner"
          title={t('receiveInfo.cardTitle')}
          className="blockstyle-first receiveinfo"
          extra={(
            <Tooltip
              placement="top"
              title={t('receiveInfo.tooltip')}
            >
              <span style={{ color: '#fff' }}>{t('common.whatIsThis')}</span>
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
                placeholder={t('receiveInfo.placeholder')}
                defaultValue={receiveInfo}
                style={{ minHeight: '117px' }}
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="color-green">
                {t('receiveInfo.save')}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(ProfileReceiveInfo));
