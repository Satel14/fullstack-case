import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import map from 'lodash/map';
import Fade from 'react-reveal/Fade';
import { itemInfoFetch } from '../store/actions/itemCache';
import { getCaseById } from '../api/all/cases';
import { getProvablyFairState } from '../api/all/provablyFair';
import { renderItemProp } from '../helpers/Case';
import { wearRank, wearColor } from '../helpers/rarity';
import Loader from '../components/mini/Loader';
import OpenCase from '../components/modules/OpenCase';

const mapStateToProps = (state) => ({
    itemCache: state.itemCache,
});

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
});

class Case extends Component {
    constructor(props) {
        super(props);
        this.state = {
            id: props.match.params.id,
            caseData: [],
            caseCollection: [],
            fetching: false,
            serverSeedHash: null,
        };
    }

    async componentDidMount() {
        await this.getData();
        await this.getProvablyFairInfo();
    }

    componentDidUpdate(prevProps) {
        if (this.props.match.params.id !== prevProps.match.params.id) {
            this.setState({
                    id: this.props.match.params.id,
                }, () => this.getData());
        }
    }

    getShortInfoItem(item, fieldName = null) {
        const { id } = item;
        const { itemCache } = this.props;

        if (fieldName === null) {
            return itemCache[id];
        }

        if (itemCache[id]) {
            return itemCache[id][fieldName];
        }

        return '';
    }

    getImagePath(item) {
        const itemInfo = this.getShortInfoItem(item);

        if (itemInfo && itemInfo.item_imagePath) {
            return encodeURI(itemInfo.item_imagePath);
        }

        return '';
    }

    getSortedItems() {
        const { caseCollection } = this.state;
        const items = (caseCollection && caseCollection.ITEMS) ? caseCollection.ITEMS : [];

        // Sort ascending by wear rarity (Battle-Scarred = most common first → Factory
        // New = rarest last); ties broken alphabetically. Wear comes from the async
        // itemCache, so the order settles as the cache fills.
        return [...items].sort((a, b) => {
            const rankDiff = wearRank(this.getShortInfoItem(a, 'item_rare'))
                - wearRank(this.getShortInfoItem(b, 'item_rare'));
            if (rankDiff !== 0) {
                return rankDiff;
            }
            const nameA = this.getShortInfoItem(a, 'item_name') || '';
            const nameB = this.getShortInfoItem(b, 'item_name') || '';
            return nameA.localeCompare(nameB);
        });
    }

    async getData() {
        this.setState({ fetching: true });
        const { id } = this.state;
        const { history } = this.props;

        let caseData;
        try {
            caseData = await getCaseById(id);
        } catch (e) {
            history.push('/404');
            return;
        }

        if (!caseData) {
            history.push('/404');
            return;
        }

        const massiveIds = [];

        if (caseData.caseCollection && caseData.caseCollection.ITEMS) {
            caseData.caseCollection.ITEMS.forEach((element) => {
                massiveIds.push(element.id);
            });

            this.addItemsToCache(massiveIds);
        }

        this.setState({
            caseCollection: caseData.caseCollection,
            caseData: caseData.data,
            fetching: false,
        });
    }

    async getProvablyFairInfo() {
        try {
            const res = await getProvablyFairState();
            this.setState({ serverSeedHash: res.data.active.serverSeedHash });
        } catch (e) {
            // anonymous users get 401/403 here - render no badge
        }
    }

    addItemsToCache(arrayItemIds) {
        const { itemCache } = this.props;
        if (!itemCache || !arrayItemIds || arrayItemIds.length === 0) {
            return;
        }
        for (let index = 0; index < arrayItemIds.length; index++) {
            const id = arrayItemIds[index];
            if (!itemCache[id]) {
                this.props.itemInfoFetch(id);
            }
        }
    }

    render() {
        const {
            caseCollection, caseData, fetching, serverSeedHash,
        } = this.state;
        const { t } = this.props;
        return (
            <div className="casepage">
                {fetching ? (
                    <Loader />
                ) : (
                    <>
                        <div className="casepage-openbutton">
                            <OpenCase data={caseData} />
                        </div>

                        {serverSeedHash && (
                            <div className="casepage-provablyfair">
                                <Tooltip title={serverSeedHash}>
                                    <Link to="/provably-fair">{t('provablyFair.badge')}</Link>
                                </Tooltip>
                            </div>
                        )}

                        <span className="casepage-title-second">
                            {t('case.contents')}
                            <i>
                                {t('case.openedCount')}
                                {' '}
                                {caseData.case_openedCount}
                            </i>
                        </span>
                        <div className="casepage-itemlist more">
                            {map(this.getSortedItems(), (item, i) => (
                                <Tooltip
                                    placement="bottom"
                                    title={renderItemProp(this.getShortInfoItem(item), null, t)}
                                    key={`itemlist${item.id}`}
                                >
                                    <Fade delay={i * 50}>
                                        <div
                                            className={`casepage-itemlist_item rc-${this.getShortInfoItem(item, 'item_rare')}`}
                                            style={{ '--rarity': wearColor(this.getShortInfoItem(item, 'item_rare')) }}
                                        >
                                            <i className="casepage-itemlist_item__wear">
                                                {this.getShortInfoItem(item, 'item_rare')}
                                            </i>
                                            <div
                                                className="casepage-itemlist_item__img"
                                                style={{ backgroundImage: `url(${this.getImagePath(item)})` }}
                                            />
                                            <span>{this.getShortInfoItem(item, 'item_name')}</span>
                                        </div>
                                    </Fade>
                                </Tooltip>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(Case));
