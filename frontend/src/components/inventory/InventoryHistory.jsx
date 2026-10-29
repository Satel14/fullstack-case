import React from 'react';
import { Tooltip, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import map from 'lodash/map';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import Loader from '../mini/Loader';
import { itemInfoFetch } from '../../store/actions/itemCache';
import { renderItemProp, itemCaption } from '../../helpers/Case';
import { timeLeft } from '../../helpers/Time';
import ItemColor from '../mini/ItemColor';
import { getStorageLastItemsByUserId } from '../../api/all/storage';
import { gradeStyle } from '../../helpers/grade';

const mapStateToProps = (state) => ({
  itemCache: state.itemCache,
});

const mapDispatchToProps = (dispatch) => ({
  itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
});

const loadItemsCount = 5;

const fetchPage = async (id, offset) => {
  const { data } = await getStorageLastItemsByUserId(id, loadItemsCount, offset);
  return data || [];
};

class InventoryHistory extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      id: props.id,
      openCaseHistory: [],
      fetching: false,
      offset: 0,
      loadMoreButton: true,
      loadFailed: false,
      loadingMore: false,
      moreFailed: false,
    };
  }

  async componentDidMount() {
    this.mounted = true;
    if (this.state.id) {
      await this.getData();
    }
  }

  componentWillUnmount() {
    this.mounted = false;
  }

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

  async getData() {
    this.setState({ fetching: true, loadFailed: false });
    const { id, offset } = this.state;

    let historyItems;
    try {
      historyItems = await fetchPage(id, offset);
    } catch (e) {
      if (this.mounted) {
        this.setState({ fetching: false, loadFailed: true });
      }
      return;
    }
    if (!this.mounted) {
      return;
    }

    this.addItemsToCache(historyItems.map((element) => element.storage_itemId));

    this.setState({
      openCaseHistory: historyItems,
      fetching: false,
      offset: loadItemsCount,
      loadMoreButton: !(historyItems.length < loadItemsCount),
    });
  }

  itemImage(id) {
    const imagePath = this.getShortInfoItem(id, 'item_imagePath');
    return imagePath ? `url(${encodeURI(imagePath)})` : 'none';
  }

  addItemsToCache(arrayItemIds) {
    arrayItemIds.forEach((id) => this.props.itemInfoFetch(id));
  }

  async loadMore() {
    const { offset, id, loadingMore } = this.state;
    if (loadingMore) {
      return;
    }
    this.setState({ loadingMore: true, moreFailed: false });

    let historyItems;
    try {
      historyItems = await fetchPage(id, offset);
    } catch (e) {
      if (this.mounted) {
        this.setState({ loadingMore: false, moreFailed: true });
      }
      return;
    }
    if (!this.mounted) {
      return;
    }

    this.addItemsToCache(historyItems.map((element) => element.storage_itemId));

    this.setState((prev) => ({
      openCaseHistory: [...prev.openCaseHistory, ...historyItems],
      offset: offset + loadItemsCount,
      loadMoreButton: !(historyItems.length < loadItemsCount),
      loadingMore: false,
    }));
  }

  renderLoadFailed() {
    const { t } = this.props;
    return (
      <div className="flex-center-center" style={{ flexDirection: 'column', marginTop: '25px' }}>
        <p>{t('inventory.historyLoadFailed')}</p>
        <Button icon={<ReloadOutlined />} onClick={() => this.getData()}>
          {t('inventory.retry')}
        </Button>
      </div>
    );
  }

  render() {
    const {
      fetching, openCaseHistory, loadMoreButton, loadFailed, loadingMore, moreFailed,
    } = this.state;
    const { t } = this.props;
    if (loadFailed) {
      return <div className="profilepage">{this.renderLoadFailed()}</div>;
    }
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
                              className="casehistory-itemlist_item"
                              style={{
                                ...gradeStyle(this.getShortInfoItem(item.storage_itemId, 'item_grade')),
                                backgroundImage: this.itemImage(item.storage_itemId),
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
                            {itemCaption({
                              grade: this.getShortInfoItem(item.storage_itemId, 'item_grade'),
                              wear: this.getShortInfoItem(item.storage_itemId, 'item_rare'),
                              type: this.getShortInfoItem(item.storage_itemId, 'item_type'),
                            }, t)}
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

            {moreFailed && (
              <p className="flex-center-center" style={{ marginTop: '25px' }}>
                {t('inventory.historyLoadFailed')}
              </p>
            )}

            {loadMoreButton && (
              <div className="flex-center-center" style={{ marginTop: '25px' }}>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  className="color-green"
                  loading={loadingMore}
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
