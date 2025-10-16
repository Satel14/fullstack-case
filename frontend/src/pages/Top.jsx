/* eslint-disable no-param-reassign */
/* eslint-disable react/jsx-props-no-multi-spaces */
/* eslint-disable react/no-access-state-in-setstate */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

import React, { Component } from 'react';
import { Row, Col, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import map from 'lodash/map';
import { connect } from 'react-redux';
import Fade from 'react-reveal/Fade';
import H2A from '../components/mini/H2A';
import { timeConverterDDMMYY } from '../helpers/Time';
import Loader from '../components/mini/Loader';
import { getStorageTop } from '../api/all/storage';

const loadItemsCount = 10;

const mapStateToProps = (state) => ({
  user: state.user,
});

class Top extends Component {
  constructor(props) {
    super(props);
    this.state = {
      items: [],
      fetching: false,
      offset: 0,
      loadMoreButton: true,
    };
  }

  componentDidMount() {
    this.mounted = true;

    this.getData();
  }

  componentWillUnmount() {
    this.mounted = false;
  }

   getData() {
    this.setState({ fetching: true });
    const { offset } = this.state;

    getStorageTop(loadItemsCount, offset).then(
      ({ data }) => {
        if (this.mounted) {
          this.setState({
            items: data || [],
            offset: loadItemsCount,
            fetching: false,
          });
        }
        return null;
      },
    )
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.log('Error', err);
      if (this.mounted) {
        this.setState({
          items: [],
          fetching: false,
        });
      }
    });
  }

  async loadMore() {
    const { offset, items } = this.state;
    const itemsAdd = await getStorageTop(loadItemsCount, offset).then(
      ({ data }) => data || [],
    ).catch(() => []);

    this.setState({
      items: [...items, ...itemsAdd],
      offset: offset + loadItemsCount,
      loadMoreButton: !(itemsAdd.length < loadItemsCount),
    });
  }

  render() {
    const { user } = this.props;
    const { items, fetching, loadMoreButton } = this.state;
    return (
      <div className="toppage">
        {fetching ? (
          <Loader />
        ) : (
          <>
            <H2A title="ТОП 50" subTitle="ГРАВЦІВ" />
            <Row gutter={16}>
              <Col className="gutter-row" span={24}>
                <div className="historyitemlist">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>{' '}</th>
                        <th>Нікнейм</th>
                        <th style={{ textAlign: 'center' }}>Відкрито кейсів</th>
                        <th style={{ textAlign: 'center' }}>Зареєстрований</th>
                      </tr>
                    </thead>
                    <tbody>
                      {map(items, (item, i) => (
                        <Fade key={`top${item.info.user_id}`}>
                          <tr
                            className={
                              item.info.user_id === user.id ? 'active' : ''
                            }
                          >
                            <td>{i + 1}</td>

                            <td>
                              <Link to={`/profile/${item.info.user_id}`}>
                                <div
                                  className="avatar"
                                  style={{
                                    backgroundImage: `url(/img/avatars/${item.info.user_avatar}.webp)`,
                                  }}
                                />
                              </Link>
                            </td>

                            <td>
                              <Link to={`/profile/${item.info.user_id}`}>
                                {item.info.user_login}
                              </Link>
                            </td>

                            <td style={{ textAlign: 'center' }}>
                              {item.count}
                            </td>

                            <td style={{ textAlign: 'center' }}>
                              {timeConverterDDMMYY(item.info.created_at)}
                            </td>
                          </tr>
                        </Fade>
                      ))}
                    </tbody>
                  </table>
                </div>

                {loadMoreButton && items && items.length !== 50 && (
                  <div
                    className="flex-center-center"
                    style={{ marginTop: '25px' }}
                  >
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      className="color-green"
                      onClick={() => this.loadMore()}
                    >
                      Завантажити ще
                    </Button>
                  </div>
                )}
              </Col>
            </Row>
          </>
        )}
      </div>
    );
  }
}

export default connect(mapStateToProps, null)(Top);

