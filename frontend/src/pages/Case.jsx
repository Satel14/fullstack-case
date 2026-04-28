import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Tooltip } from 'antd';
import map from 'lodash/map';
import Fade from 'react-reveal/Fade';
import { itemInfoFetch } from '../store/actions/itemCache';
import { getCaseById } from '../api/all/cases';
import { renderItemProp } from '../helpers/Case';
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
        };
    }

    async componentDidMount() {
        await this.getData();
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

    async getData() {
        this.setState({ fetching: true });
        const { id } = this.state;
        const { history } = this.props;

        const caseData = await getCaseById(id).then((data) => data);

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
        const { caseCollection, caseData, fetching } = this.state;
        return (
            <div className="casepage">
                {fetching ? (
                    <Loader />
                ) : (
                    <>
                        <div className="casepage-openbutton">
                            <OpenCase data={caseData} />
                        </div>

                        <span className="casepage-title-second">
                            Вміст кейсу
                            <i>
                                Кількість відкритих:
                                {' '}
                                {caseData.case_openedCount}
                            </i>
                        </span>
                        <div className="casepage-itemlist more">
                            {caseCollection && caseCollection.ITEMS && map(caseCollection.ITEMS, (item, i) => (
                                <Tooltip
                                    placement="bottom"
                                    title={renderItemProp(this.getShortInfoItem(item))}
                                    key={`itemlist${item.id}`}
                                >
                                    <Fade delay={i * 50}>
                                        <div
                                            className={`casepage-itemlist_item rc-${this.getShortInfoItem(item, 'item_rare')}`}
                                            style={{
                                                backgroundImage: `url(${this.getImagePath(item)})`,
                                                backgroundSize: 'contain',
                                                backgroundPosition: 'center',
                                                backgroundRepeat: 'no-repeat',
                                            }}
                                        >
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

export default connect(mapStateToProps, mapDispatchToProps)(Case);
