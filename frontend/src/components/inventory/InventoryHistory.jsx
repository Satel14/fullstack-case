import React from 'react';
import { Tooltip, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import map from 'lodash/map';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import Loader from '../mini/Loader';
import { itemInfoFetch } from '../../store/actions/itemCache';
import { renderItemProp } from '../../helpers/Case';
import { timeLeft } from '../../helpers/Time';
import ItemColor from '../mini/ItemColor';
import { getStorageLastItemsByUserId } from '../../api/all/storage';

const mapStateToProps = (state) => ({
  itemCache: state.itemCache,
});

const mapDispatchToProps = (dispatch) => ({
  itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
});

const loadItemsCount = 5;
class InventoryHistory extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      id: props.id,
      openCaseHistory: [],
      fetching: false,
      offset: 0,
      loadMoreButton: true,
    };
  }

  // eslint-disable-next-line react/sort-comp
  getShortInfoItem(id, fieldName = null) {
    const { itemCache } = this.props;

    if (!fieldName) {
      return itemCache[id];
    }
    if (itemCache[id]) {
      return itemCache[id][fieldName];
    }

    return '';
  }

  addItemsToCache(arrayItemIds) {
    const { itemCache } = this.props;
    for (let index = 0; index < arrayItemIds.length; index++) {
      const id = arrayItemIds[index];
      if (!itemCache[id]) {
        this.props.itemInfoFetch(id);
      }
    }
  }

  async componentDidMount() {
    if (this.state.id) {
      await this.getData();
    }
  }

  async loadMore() {
    const { offset, openCaseHistory, id } = this.state;
    const historyItems = await getStorageLastItemsByUserId(
      id,
      loadItemsCount,
      offset,
    ).then(({ data }) => data);

    const massiveIds = [];

    historyItems.forEach((element) => {
      massiveIds.push(element.storage_itemId);
    });

    this.addItemsToCache(massiveIds);

    this.setState({
      openCaseHistory: [...openCaseHistory, ...historyItems],
      offset: offset + loadItemsCount,
      loadMoreButton: !(historyItems.length < loadItemsCount),
    });
  }

  async getData() {
    this.setState({ fetching: true });
    const { id, offset } = this.state;

    const historyItems = await getStorageLastItemsByUserId(
      id,
      loadItemsCount,
      offset,
    ).then(({ data }) => data);

    const massiveIds = [];

    historyItems.forEach((element) => {
      massiveIds.push(element.storage_itemId);
    });

    this.addItemsToCache(massiveIds);

    this.setState({
      openCaseHistory: historyItems,
      fetching: false,
      offset: loadItemsCount,
      loadMoreButton: !(historyItems.length < loadItemsCount),
    });
  }

  render() {
    const { fetching, openCaseHistory, loadMoreButton } = this.state;
    const { t } = this.props;
    return (
      <div className="profilepage">
        {fetching ? (
          <Loader />
        ) : (
          <>
            <div className="historyitemlist">
              <table>
                <thead>
                  <tr>
                    <th>{t('inventory.item')}</th>
                    <th>{t('inventory.name')}</th>
                    <th>{t('inventory.statusCol')}</th>
                    <th>{t('inventory.time')}</th>
                  </tr>
                </thead>
                <tbody>
                  {map(openCaseHistory, (item) => (
                      <tr key={`inventoryhistory${item.storage_id}`}>
                        <td>
                          <Tooltip
                            placement="bottom"
                            title={renderItemProp(
                              this.getShortInfoItem(item.storage_itemId, null),
                              item.storage_color,
                              this.props.t,
                            )}
                          >
                            <div
                              className={
                                `casehistory-itemlist_item r-${
                                this.getShortInfoItem(
                                  item.storage_itemId,
                                  'item_rare',
                                )}`
                              }
                              style={{
                                backgroundImage: `url(/img/items/${item.storage_itemId}.webp)`,
                              }}
                            >
                              <ItemColor color={item.storage_color} />
                            </div>
                          </Tooltip>
                        </td>

                        <td>
                          {this.getShortInfoItem(
                            item.storage_itemId,
                            'item_name',
                          )}

                          <div>
                            {this.getShortInfoItem(
                              item.storage_itemId,
                              'item_rare',
                            )}
                            -
                            {this.getShortInfoItem(
                              item.storage_itemId,
                              'item_type',
                            )}
                          </div>
                        </td>

                        <td>{t(`inventory.status.${item.storage_status}`)}</td>

                        <td>
                          {timeLeft(item.created_at) ? (
                            <>{timeLeft(item.created_at)}</>
                          ) : (
                            <>{t('inventory.now')}</>
                          )}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loadMoreButton && (
              <div className="flex-center-center" style={{ marginTop: '25px' }}>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  className="color-green"
                  onClick={() => this.loadMore()}
                >
                  {t('inventory.loadMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(InventoryHistory));
