/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */

import React, { Component } from 'react';
import Fade from 'react-reveal/Fade';
import Zoom from 'react-reveal/Zoom';
import { Button, Radio, Alert } from 'antd';
import styled, { keyframes } from 'styled-components';
import {
    SyncOutlined,
    DollarOutlined,
    RollbackOutlined, UnlockOutlined, BlockOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import map from 'lodash/map';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import { isAuthorized } from '../../helpers/Player';
import { openCaseById } from '../../api/all/cases'
import { sellItemByStorageId } from '../../api/all/storage';
import { getItemPriceById } from '../../api/all/item'
import openNotification from '../mini/openNotification';
import H2A from '../mini/H2A';
import CasePrice from '../mini/CasePrice';
import { itemInfoFetch } from '../../store/actions/itemCache';
import { success } from 'concurrently/src/defaults';
import ItemColor from '../mini/ItemColor';

const delayAnimation = 4;

const moveVertically = (top) => keyframes`
  0% {
    transform: translateY(-140px)
  }
  20% {
    transform: translateY(-100px)
  }
  100% {
    transform: translateY(${top}px)
  }
`;
const ShadowOverlay = styled.div`
  transform: translateY(${(p) => (p.load ? p.top : -140)}px);
  animation-timing-function: ease;
  animation: ${(p) => (p.load ? moveVertically(p.top) : 'none')}
    ${delayAnimation}s ease;
  animation-fill-mode: forwards;
`;

const randomInteger = (min, max) => {
    const rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
};

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
});

const mapStateToProps = (state) => ({
    user: state.user,
    itemCache: state.itemCache,
    modules: state.modules,
});
// react/sort-comp
const calculatePositionForLine = (winner) => {
    const heightOneBlock = 110; // 110px
    const resultTopPixel = -heightOneBlock * (winner.winIndex - 1)
        + 270
        + winner.winIndex
        - randomInteger(5, heightOneBlock - 5);

    return resultTopPixel;
};

class OpenCase extends Component {
    constructor(props) {
        super(props);
        this.state = {
            openMethod: '',
            randomItemList: [],
            winner: null,
            load: false,
            loadItem: false,
            loadIndex: null,
            clicked: false,
            processWorking: false,
            loading: false,
            openCount: '1'
        };

        this.openBlockMethod = this.openBlockMethod.bind(this);
        this.openScrollMethod = this.openScrollMethod.bind(this);
        this.getBack = this.getBack.bind(this);
        this.getLoginPage = this.getLoginPage.bind(this);
    }

    getShortInfoItem(id, fieldName) {
        const {itemCache} = this.props;
        if (itemCache[id]) {
            return itemCache[id][fieldName];
        }

        return '';
    }

    async openFastMethod() {
        const {processWorking, loading} = this.state;
        if (processWorking || loading) {
            return;
        }

        this.setState({
            processWorking: true,
            loading: true,
        });

        const result = await this.open();

        if (!result) {
            return;
        }

        setTimeout(() => {
            this.setState({
                load: true,
                openMethod: '',
                loadItem: true,
                processWorking: false,
                loading: false
            });
        });
    }

    getBack() {
        this.setState({
            openMethod: '',
            load: false,
            randomItemList: [],
            winner: null,
            loadIndex: null,
            loadItem: false,
            loadAll: false,
            clicked: false,
            openCount: '1',
            prices: [],
        })
    }

    getLoginPage() {
        const { history } = this.props;
        if (history) {
            history.push('/login')
        }
    }

    async sellItem(storageId, i, notify = true) {
        const {prices} = this.state;

        const result = await sellItemByStorageId(storageId);
        if (result.status === 200){
            window.HeaderSecond.changeBalance(result.balance);
            if (notify) {
                openNotification(success, 'Предмето продано');
            }
            delete prices[i];
            this.setState({
                prices,
            })
            return;
        }
        if (notify) {
            openNotification('error', 'Виникла помилка');
        }
    }
    async open() {
        const { data } = this.props;
        console.log(data, 'data')
        const { openCount } = this.state;
        if (
            data.case_openLimit <= data.case_openedCount
            && data.case_openLimit !== 0
        ) {
            this.setState({
                load: false,
                openMethod: '',
                processWorking: false,
                loadItem: false,
                loading: false,
            });
            openNotification(
                'error',
                'У цього кейса досяг ліміт відкриття. Цей кейс більше не можна відрити!',
                );
            return false;
        }

        const result = await openCaseById(
            data.case_id,
            parseInt(openCount, 10),
        ).then((res) => res).catch((err) => {
            openNotification('error', 'Помилка', 'Ви не авторизовані або недостатньо коштів');
            this.setState({
                loading: false,
                processWorking: false,
            });
            return null;
        });

        if (!result) return false;

        if (!result.balance) {
            openNotification('error', 'Помилка', result.message);
            this.setState({
                loading: false,
            });
            return false;
        }

        const actualPricesD = [];

        for (const key in result.data) {
            const element = result.data[key];

            // eslint-disable-next-line no-await-in-loop
            const itemPrice = await getItemPriceById(element.winner.item.id);
            const prices = JSON.parse(itemPrice.prices);
            let { color } = element.winner.item;
            color = color.toLowerCase();
            color = color.replace(' ', '');

            const creditToUAH = this.props.modules['uah-credit-rate'].extraData;

            let actualPrice = null;
            if (prices) {
                if (prices[color]) {
                    actualPrice = parseInt(prices[color] * creditToUAH * 100, 10) / 100;
                }
            }
            actualPricesD.push(actualPrice);
        }

        const randomList = [];
        const winnerList = [];

        for (const key in result.data) {
            const element = result.data[key];
            randomList.push(element.resultWithItem);
            winnerList.push(element.winner);
        }
        this.setState({
            randomItemsList: randomList,
            winner: winnerList,
            prices: actualPricesD,
        });

        window.HeaderSecond.changeBalance(result.balance);
        return true;
    }

    onChangeRadio(e) {
        const { value } = e.target;
        this.setState({openCount: value});
    }

    getSummAll() {
        const {prices} = this.state;
        let sum = 0.0;

        for (let index = 0; index <prices.length; index++) {
            const element = parseFloat(prices[index]);
            if (element) {
                sum += element;
            }
        }

        if (sum === 0.0) {
            return null;
        }

        return sum.toFixed(2);
    }

    async openScrollMethod() {
        const {processWorking, loading} = this.state;
        if (processWorking || loading) {
            return;
        }

        this.setState({
            processWorking: true,
            loading: true,
        });

        const result = await this.open();

        if (!result) {
            return;
        }
        this.setState({
            openMethod: 'scroll',
            load: true,
        })
        setTimeout(() => {
            this.setState({
                loadItem: true,
                openMethod: '',
                processWorking: false,
                loading: false
            });
        }, delayAnimation * 1000 + 2000);
    }

    async openBlockMethod(index = null) {
        const {processWorking, loading} = this.state;
        if (processWorking || loading) {
            return;
        }

        this.setState({
            openMethod: 'block',
            load: true,
        });

        if (index === null || this.state.clicked) {
            return;
        }

        this.setState({
            openMethod: 'block',
            load: true,
            loading: true,
        })

        this.setState({
            processWorking: true,
        })

        const result = await this.open();

        if (!result) {
            return;
        }
        this.setState({
            loadIndex: index,
            clicked: true,
        })

        setTimeout(() => {
            this.setState({
                loadAll: true,
            })
        }, 1000);

        setTimeout(() => {
            this.setState({
                openMethod: '',
                loadItem: true,
                clicked: false,
                processWorking: false,
                loading: false
            });
        }, 3000);
    }

    async sellItemAll() {
        const { winner } = this.state;
        const storageIds = [];

        for (const key in winner) {
            storageIds.push(winner[key].storageId);
        }

        const promises = [];
        for (let index = 0; index < storageIds.length; index++) {
            const element = storageIds[index];
            promises.push(await this.sellItem(element, index, false));
        }

        await Promise.all(promises);
        openNotification('success', 'Предмети продані');
    }

    renderBlock() {
        const massive = [];
        const max = 22; // full 22
        const randomItemsList = this.state.randomItemsList[0];

        const newMassive = [];

        if (randomItemsList) {
            const {loadIndex} = this.state;
            const {winIndex} = this.state.winner;
            const startRandomList = winIndex - loadIndex - 1;
            for (
                let index = startRandomList;
                index < randomItemsList.length;
                index++
            ) {
                newMassive.push(randomItemsList[index])
            }

            if (newMassive.length < max) {
                for (let index = 0; index < 100; index++) {
                    newMassive.push(randomItemsList[index]);

                    if (newMassive.length === max) {
                        break;
                    }
                }
            }
        }

        for (let index = 0; index < max; index++) {
            const item = newMassive[index] || {};

            massive.push(
                <div
                className={
                    index === this.state.loadIndex || this.state.loadAll
                    ? 'loterylist opened'
                    : 'loterylist'
                }
                >
                    <div className="front" onClick={() => this.openBlockMethod(index)} />
                    <div className="back">
                        {newMassive.length && (
                            <div
                            className={`casepage-itemlist_item rc-${this.getShortInfoItem(
                                item.id,
                                'item_rare',
                            )}`}
                            style={{
                                backgroundImage: `url(/img/items/${item.id}.png)`,
                            }}
                            >
                                <ItemColor color={item.color} />
                                <span>{this.getShortInfoItem(item.id, 'item_name')}</span>
                            </div>
                        )}
                    </div>
                </div>
            )
        }
    }

    render() {
        const {
            randomItemList,
            load,
            loadItem,
            winner,
            openMethod,
            clicked,
            loading,
            openCount,
            prices,
        } = this.state;
        const {data, user} = this.props;

        return (
            <>
                {isAuthorized(user) ? (
                    <>
                        {!load && (
                            <>
                                <div className="casepage-more">
                                    <Fade>
                                        <div />
                                        {/* <H2A title="Кейс" subTitle={data.case_title}/> */}
                                        {/*  <img src={caseCollection.img} alt={caseCollection.name} /> */}
                                    </Fade>
                                    <div>
                                        {/* <CasePrice data={data} count={openCount}/> */}
                                    </div>
                                    <div className="count-buttons">
                                        <Radio.Group
                                            buttonStyle="solid"
                                            defaultValue={openCount}
                                            onChange={(e) => this.onChangeRadio(e)}
                                            value={openCount}
                                        >
                                            <Radio.Button value="1">1</Radio.Button>
                                            <Radio.Button value="2">2</Radio.Button>
                                            <Radio.Button value="3">3</Radio.Button>
                                            <Radio.Button value="4">4</Radio.Button>
                                            <Radio.Button value="5">5</Radio.Button>
                                            <Radio.Button value="10">10</Radio.Button>
                                            <Radio.Button value="20">20</Radio.Button>
                                        </Radio.Group>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => this.openScrollMethod()}
                                    size="large"
                                    type="primary"
                                    icon={<UnlockOutlined/>}
                                    style={{ marginRight: 10 }}
                                    className="color-purple"
                                    loading={loading}
                                >
                                    Відкрити
                                </Button>
                                {openCount === '1' && (
                                    <Button
                                        onClick={() => this.openBlockMethod()}
                                        size="large"
                                        type="primary"
                                        icon={<BlockOutlined/>}
                                        style={{ marginRight: 10 }}
                                        className="color-red"
                                        loading={loading}
                                    >
                                        Відкрити блоками
                                    </Button>
                                )}
                                <Button
                                    onClick={() => this.openFastMethod()}
                                    size="large"
                                    type="primary"
                                    icon={<ThunderboltOutlined/>}
                                    className="color-orange"
                                    loading={loading}
                                >
                                    Швидко
                                </Button>
                            </>
                        )}

                        {load && (
                            <div className="opencase">
                                {loadItem ? (
                                    <div className="opencase-result">
                                        <div
                                            className="opencase-result__img"
                                            style={{
                                                backgroundImage: `url(/img/items/${winner.item.id}.png)`,
                                                boxShadow: `inset 0px -30px 60px -30px${getColorRariest(winner.item.rare)}`,
                                            }}
                                        />
                                        {winner.item.name}
                                        <span>
                                                            {winner.item.rare}
                                            {winner.item.type}
                                                        </span>
                                        <div className="opencase-result__buttons">
                                            <Button type="primary" icon={<SyncOutlined/>}
                                                    size="large">
                                                Спробувати ще раз
                                            </Button>
                                            <Button
                                                className="buttons-back"
                                                type="primary"
                                                icon={<RollbackOutlined/>}
                                                size="large"
                                                danger
                                                onClick={() => window.history.back()}
                                            >
                                                Повернутися назад
                                            </Button>
                                            <Button
                                                type="primary"
                                                icon={<DollarOutlined/>}
                                                ghost
                                                size="large"
                                            >
                                                Продати за 500 cred
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Zoom left>
                                            <div className="opencase-titlecrate">
                                                Відкриття
                                                {' '}
                                                <span>Кейс - Prime</span>
                                            </div>
                                        </Zoom>
                                        <Zoom right>
                                            <div className="case-overlay"/>
                                        </Zoom>
                                        {winner && winner.item && (
                                            <Fade delay={delayAnimation * 1000 + 500}>
                                                <div className="opencase-titleitem">
                                                    {winner.item.name}
                                                    <span>
                                                        {winner.item.rare}
                                                        {' '}
                                                        {winner.item.type}
                                                    </span>
                                                </div>
                                            </Fade>
                                        )}

                                        {winner && (
                                            <div className="opencase-block">
                                                <div className="line-overlay"/>

                                                <div className="shadow-overlay">
                                                    <ShadowOverlay
                                                        load={load}
                                                        top={calculatePositionForLine(winner[i])}
                                                    >
                                                        {map(caseCollection, (item, i) => (
                                                            <>
                                                                <div
                                                                    className={
                                                                        i === winner.winIndex - 1
                                                                            ? 'item active'
                                                                            : 'item '
                                                                    }
                                                                style={{
                                                                    backgroundImage: `url(/img/items/${item.id}.png)`,
                                                                    boxShadow: `inset  0px -30px 60px -30px
                                                                                    ${getColorRariest(item.rare)}`,
                                                                }}
                                                                key={`openedItem${i}`}
                                                            />
                                                        </>
                                                        ))}
                                                    </ShadowOverlay>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="casepage-more">
                            <Fade>
                                {/* <H2A title="Кейс" subTitle={'222222222222'}/> */}
                                {/* <CasePrice data={data} count={openCount}/> */}
                            </Fade>
                        </div>
                        <div className="alert-case-auth">
                            <Alert
                                message="Щоб відкрити кейс потрібно пройти авторизацію"
                                type="error"
                                showIcon
                            />
                        </div>

                        <Link to="/login">
                            <Button
                                onClick={() => this.getLoginPage()}
                                size="large"
                                type="primary"
                                icon={<ThunderboltOutlined/>}
                                className="color-red"
                            >
                                Авторизуватися
                            </Button>
                        </Link>
                    </>
                )}
            </>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(OpenCase)
