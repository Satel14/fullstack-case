import React, { Component } from 'react';
import Flip from 'react-reveal/Flip';
import map from 'lodash/map';
import CaseMini from '../components/mini/CaseMini';
import testCaseList from '../data/testCaseList';
import H2A from '../components/mini/H2A';
import collectionCase from '../data/collectionCase';
import { itemInfoFetch } from '../store/actions/itemCache';
import { connect } from 'react-redux';
import { getCaseById } from '../api/all/cases';
import Loader from '../components/mini/Loader';
import OpenCase from '../components/modules/OpenCase';
import Fade from 'react-reveal/Fade';
import { renderItemProp } from '../helpers/Case';
import { Tooltip } from 'antd';

const mapStateToProps = (state) => ({
    itemCache: state.itemCache,
})

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id))
})

const isHaveColors = (colors) => {
    if (!colors || !Array.isArray(colors)) {
        return false;
    }
    if (colors.length === 1) {
        return true;
    }

    return false;
}

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
        await this.getData()
    }

    getShortInfoItem(item, fieldName = null) {
        const {id} = item;
        const {itemCache} = this.props;

        if (fieldName === null) {
            return itemCache[id];
        }

        if (itemCache[id]) {
            return itemCache[id][fieldName]
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

    componentDidUpdate(prevProps) {
        if (this.props.match.params.id !== prevProps.match.params.id) {
            this.setState({
                    id: this.props.match.params.id,
                },
                () => this.getData(),
            );
        }
    }

    async getData() {
        this.setState({fetching: true});
        const {id} = this.state;
        const {history} = this.props;

        const caseData = await getCaseById(id).then((data) => data);

        console.log(caseData);

        if (!caseData) {
            history.push('/404');
            return;
        }

        const massiveIds = [];

        // caseData.caseCollection.ITEMS.forEach((element) => {
        //     massiveIds.push(element.id);
        // });
        //
        // this.addItemsToCache(massiveIds);

        this.setState({
            caseCollection: caseData.caseCollection,
            caseData: caseData.data,
            fetching: false
        });
    }

    render() {
        const { caseCollection, caseData, fetching } = this.state;
        console.log(caseCollection, 'caseCollection');
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
                                Кількість відкритих: {' '}
                                {caseData.case_openedCount}
                            </i>
                        </span>
                        <div className="casepage-itemlist more">
                            {caseCollection && caseCollection.ITEMS && map(caseCollection.ITEMS, (item, i) => (
                                <Fade delay={i * 50} key={`itemlist${item.id}`}>
                                    <Tooltip
                                        placement="bottom"
                                        title={renderItemProp(this.getShortInfoItem(item))}
                                    >
                                        <div>

                                        </div>
                                    </Tooltip>
                                </Fade>
                            ))}
                        </div>
                    </>
                )}
            </div>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Case)