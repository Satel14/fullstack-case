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
import { gradeName, gradeRank, gradeStyle } from '../helpers/grade';
import { formatChance, gradeOdds } from '../helpers/odds';
import { computeItemPriceUAH } from '../helpers/price';
import { marketUrl } from '../helpers/market';
import { isRefusal } from '../helpers/serverMessage';
import Loader from '../components/mini/Loader';
import LoadError from '../components/mini/LoadError';
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
            odds: null,
            fetching: false,
            failed: false,
            serverSeedHash: null,
        };
        this.mounted = false;
        this.loadGeneration = 0;
    }

    async componentDidMount() {
        this.mounted = true;
        await this.getData();
        if (this.mounted) {
            await this.getProvablyFairInfo();
        }
    }

    componentDidUpdate(prevProps) {
        if (this.props.match.params.id !== prevProps.match.params.id) {
            this.setState({
                    id: this.props.match.params.id,
                }, () => this.getData());
        }
    }

    componentWillUnmount() {
        this.mounted = false;
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

    getItemPrice(item) {
        const prices = this.getShortInfoItem(item, 'pricesInCredits');
        return computeItemPriceUAH(prices, 'default') || 0;
    }

    getSortedItems() {
        const { caseCollection } = this.state;
        const items = (caseCollection && caseCollection.ITEMS) ? caseCollection.ITEMS : [];

        return [...items].sort((a, b) => {
            const gradeDiff = gradeRank(this.getShortInfoItem(b, 'item_grade'))
                - gradeRank(this.getShortInfoItem(a, 'item_grade'));
            if (gradeDiff !== 0) {
                return gradeDiff;
            }
            return this.getItemPrice(b) - this.getItemPrice(a);
        });
    }

    getGradeOdds() {
        const { caseCollection, odds } = this.state;
        const items = (caseCollection && caseCollection.ITEMS) ? caseCollection.ITEMS : [];
        return gradeOdds(items, odds, (id) => this.getShortInfoItem({ id }, 'item_grade'));
    }

    async getData() {
        this.loadGeneration += 1;
        const generation = this.loadGeneration;
        this.setState({ fetching: true, failed: false });
        const { id } = this.state;
        const { history } = this.props;

        let caseData = null;
        let failure = null;
        try {
            caseData = await getCaseById(id);
        } catch (e) {
            failure = e;
        }

        if (!this.mounted || generation !== this.loadGeneration) {
            return;
        }

        if (failure && !isRefusal(failure)) {
            this.setState({ fetching: false, failed: true });
            return;
        }

        if (!caseData) {
            history.replace('/404');
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
            odds: caseData.odds || null,
            fetching: false,
        });
    }

    async getProvablyFairInfo() {
        const res = await getProvablyFairState().catch(() => null);
        if (this.mounted && res) {
            this.setState({ serverSeedHash: res.data.active.serverSeedHash });
        }
    }

    async refreshCase() {
        const { id } = this.state;
        try {
            const caseData = await getCaseById(id);
            if (this.mounted && caseData && caseData.data && caseData.data.case_id === id) {
                this.setState({ caseData: caseData.data });
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    addItemsToCache(arrayItemIds) {
        if (!arrayItemIds) {
            return;
        }
        arrayItemIds.forEach((id) => this.props.itemInfoFetch(id));
    }

    render() {
        const {
            caseData, fetching, failed, serverSeedHash, odds,
        } = this.state;
        const { t, i18n } = this.props;
        const oddsByGrade = this.getGradeOdds();
        if (failed) {
            return (
                <div className="casepage">
                    <LoadError onRetry={() => this.getData()} />
                </div>
            );
        }
        return (
            <div className="casepage">
                {fetching ? (
                    <Loader />
                ) : (
                    <>
                        <div className="casepage-openbutton">
                            <OpenCase data={caseData} onCaseChanged={() => this.refreshCase()} />
                        </div>

                        <div className="casepage-provablyfair">
                            <Tooltip title={serverSeedHash}>
                                <Link to="/provably-fair">{t('provablyFair.badge')}</Link>
                            </Tooltip>
                        </div>

                        <span className="casepage-title-second">
                            {t('case.contents')}
                            <i>
                                {t('case.openedCount')}
                                {' '}
                                {caseData.case_openedCount}
                            </i>
                        </span>
                        {oddsByGrade.length > 0 && (
                            <div className="casepage-odds">
                                <span id="case-odds-title">{t('case.oddsByGrade')}</span>
                                <ul aria-labelledby="case-odds-title">
                                    {oddsByGrade.map(({ grade, chance }) => (
                                        <li key={grade} style={gradeStyle(grade)}>
                                            {gradeName(grade, t)}
                                            {' '}
                                            <b>{formatChance(chance, i18n?.language)}</b>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        <div className="casepage-itemlist more">
                            {map(this.getSortedItems(), (item, i) => {
                                const name = this.getShortInfoItem(item, 'item_name');
                                const type = this.getShortInfoItem(item, 'item_type');
                                const price = this.getItemPrice(item);
                                const grade = this.getShortInfoItem(item, 'item_grade');
                                const chance = odds && odds[item.id] !== undefined ? formatChance(odds[item.id], i18n?.language) : null;
                                return (
                                    <Fade delay={i * 50} key={`itemlist${item.id}`}>
                                        <Tooltip
                                            placement="bottom"
                                            trigger={['hover', 'focus']}
                                            title={renderItemProp(this.getShortInfoItem(item), null, t, chance)}
                                        >
                                            <a
                                                className="casepage-itemlist_item"
                                                href={marketUrl(name, type === 'knife')}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={[
                                                    name,
                                                    price > 0 && `${price} ₴`,
                                                    gradeName(grade, t),
                                                    chance && `${t('item.chance')} ${chance}`,
                                                ].filter(Boolean).join(', ')}
                                                style={gradeStyle(grade)}
                                            >
                                                <div
                                                    className="casepage-itemlist_item__img"
                                                    style={{ backgroundImage: `url(${this.getImagePath(item)})` }}
                                                />
                                                <div className="casepage-itemlist_item__footer">
                                                    <div className="casepage-itemlist_item__name">{name}</div>
                                                    {price > 0 && (
                                                        <b className="casepage-itemlist_item__price">
                                                            {price}
                                                            {' ₴'}
                                                        </b>
                                                    )}
                                                </div>
                                                {chance && <div className="casepage-itemlist_item__chance">{chance}</div>}
                                            </a>
                                        </Tooltip>
                                    </Fade>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(Case));
