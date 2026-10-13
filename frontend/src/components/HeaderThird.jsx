import React from 'react';
import { Layout, Tooltip } from 'antd';
import { Link } from 'react-router-dom';
import map from 'lodash/map';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { renderItemProp } from '../helpers/Case';
import ItemColor from './mini/ItemColor';
import { getStorageLastItemsWithUserInfo } from '../api/all/storage';
import { itemInfoFetch, addItemsToCache } from '../store/actions/itemCache';
import socket from '../api/all/ws';

const { Header } = Layout;

const FEED_LENGTH = 40;

const mergeDrops = (newer, older) => {
    const newerIds = new Set(newer.map((item) => item.storage_id));
    return [...newer, ...older.filter((item) => !newerIds.has(item.storage_id))].slice(0, FEED_LENGTH);
};

const mapStateToProps = (state) => ({
    itemCache: state.itemCache,
});

const mapDispatchToProps = (dispatch) => ({
    fetchItemInfo: (id) => dispatch(itemInfoFetch(id)),
    cacheItems: (itemList) => dispatch(addItemsToCache(itemList)),
});

class HeaderThird extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            storageLast: [],
        };
        this.handleNewDrop = this.handleNewDrop.bind(this);
    }

    async componentDidMount() {
        this.mounted = true;
        socket.on('new-drop', this.handleNewDrop);
        try {
            const result = await getStorageLastItemsWithUserInfo(FEED_LENGTH);
            if (this.mounted && result && result.status === 200) {
                const loaded = result.data || [];
                this.setState((prevState) => ({ storageLast: mergeDrops(prevState.storageLast, loaded) }));

                this.props.cacheItems(result.itemList);
                loaded.forEach((item) => this.props.fetchItemInfo(item.storage_itemId));
            }
        } catch (e) {
            console.error('HeaderThird: Failed to fetch recent wins:', e);
        }
    }

    componentWillUnmount() {
        this.mounted = false;
        socket.off('new-drop', this.handleNewDrop);
    }

    handleNewDrop(item) {
        this.setState((prevState) => ({ storageLast: mergeDrops([item], prevState.storageLast) }));
        this.props.fetchItemInfo(item.storage_itemId);
    }

    getShortInfoItem(id, fieldName = null) {
        const { itemCache } = this.props;
        if (fieldName === null) {
            return itemCache[id];
        }
        if (itemCache[id]) {
            return itemCache[id][fieldName];
        }
        return '';
    }

    getImagePath(id) {
        const { itemCache } = this.props;
        const itemInfo = itemCache[id];

        if (itemInfo && itemInfo.item_imagePath) {
            return encodeURI(itemInfo.item_imagePath);
        }

        return '';
    }

    render() {
        const { storageLast } = this.state;

        if (!storageLast || storageLast.length === 0) {
            return null;
        }

        return (
            <Header className="headersecond third">
                {map(storageLast, (item, i) => (
                    <div key={`header-${item.storage_id}`}>
                        {i < FEED_LENGTH && (
                            <Tooltip
                                placement="bottom"
                                title={renderItemProp(
                                    this.getShortInfoItem(item.storage_itemId, null),
                                    item.storage_color,
                                    this.props.t,
                                )}
                            >
                                <Link to={`/profile/${item.storage_userId}`}>
                                    <div
                                        className={`casepage-itemlist_item r-${this.getShortInfoItem(item.storage_itemId, 'item_rare')}`}
                                        style={{
                                            backgroundImage: `url(${this.getImagePath(item.storage_itemId)})`,
                                            backgroundRepeat: 'no-repeat',
                                        }}
                                    >
                                        <ItemColor color={item.storage_color} />
                                    </div>
                                </Link>
                            </Tooltip>
                        )}
                    </div>
                ))}
            </Header>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(HeaderThird));
