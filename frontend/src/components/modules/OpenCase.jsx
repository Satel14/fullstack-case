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
import { openCaseById } from '../../api/all/cases';
import { sellItemByStorageId } from '../../api/all/storage';
import { getItemPriceById } from '../../api/all/item';
import openNotification from '../mini/openNotification';
import { itemInfoFetch } from '../../store/actions/itemCache';
import ItemColor from '../mini/ItemColor';

const delayAnimation = 4;

const moveHorizontally = (left) => keyframes`
  0% {
    transform: translateX(140px)
  }
  20% {
    transform: translateX(100px)
  }
  100% {
    transform: translateX(${left}px)
  }
`;
const ShadowOverlay = styled.div`
  display: flex;
  flex-direction: row;
  width: max-content;
  transform: translateX(${(p) => (p.load ? p.left : 140)}px);
  animation-timing-function: ease;
  animation: ${(p) => (p.load ? moveHorizontally(p.left) : 'none')}
    ${delayAnimation}s ease;
  animation-fill-mode: forwards;
`;

const randomInteger = (min, max) => {
    const rand = min + Math.random() * (max + 1 - min);
    return Math.floor(rand);
};

const getColorRariest = (rare) => {
    const colors = {
        'Consumer Grade': '#B0C3D9',
        'Industrial Grade': '#5E98D9',
        'Mil-Spec': '#4B69FF',
        'Restricted': '#8847FF',
        'Classified': '#D32CE6',
        'Covert': '#EB4B4B',
    };
    return colors[rare] || '#B0C3D9';
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
    const widthOneBlock = 140; // 140px (130px width + 10px margin/border)
    // Container center offset + half item width
    const containerCenter = 380;
    const resultLeftPixel = -widthOneBlock * (winner.winIndex - 1)
        + containerCenter
        + winner.winIndex
        - randomInteger(5, widthOneBlock - 15);

    return resultLeftPixel;
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
            openCount: '1',
        };

        this.openBlockMethod = this.openBlockMethod.bind(this);
        this.openScrollMethod = this.openScrollMethod.bind(this);
        this.getBack = this.getBack.bind(this);
        this.getLoginPage = this.getLoginPage.bind(this);
    }

    getShortInfoItem(id, fieldName) {
        const { itemCache } = this.props;
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

    async openFastMethod() {
        const { processWorking, loading } = this.state;
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
                loading: false,
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
        });
    }

    getLoginPage() {
        const { history } = this.props;
        if (history) {
            history.push('/login');
        }
    }

    async sellItem(storageId, i, notify = true) {
        const { prices } = this.state;

        try {
            const result = await sellItemByStorageId(storageId);
            if (result.status === 200) {
                window.HeaderSecond.changeBalance(result.balance);
                if (notify) {
                    openNotification('success', 'Предмет продано');
                }
                delete prices[i];
                this.setState({
                    prices,
                });
                return;
            }
            if (notify) {
                openNotification('error', 'Помилка продажу', result.message || 'Не вдалося продати предмет');
            }
        } catch (e) {
            if (notify) {
                openNotification('error', 'Помилка', 'Не вдалося продати предмет');
            }
        }
    }

    async open() {
        const { data } = this.props;
        const { openCount } = this.state;
        const requestCount = parseInt(openCount, 10);
        const maxLimit = Number(data.case_openLimit);
        const openedCount = Number(data.case_openedCount || 0);

        if (maxLimit !== -1) {
            const remaining = maxLimit - openedCount;

            if (remaining <= 0) {
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

            if (requestCount > remaining) {
                this.setState({
                    load: false,
                    openMethod: '',
                    processWorking: false,
                    loadItem: false,
                    loading: false,
                });
                openNotification(
                    'error',
                    'Перевищено ліміт',
                    `Можна відкрити ще тільки ${remaining}`,
                );
                return false;
            }
        }

        const result = await openCaseById(
            data.case_id,
            requestCount,
        ).then((res) => res).catch((err) => {
            openNotification('error', 'Помилка', 'Ви не авторизовані або недостатньо коштів');
            this.setState({
                loading: false,
                processWorking: false,
            });
            return null;
        });

        if (!result) return false;

        if (!result.balance && result.balance !== 0) {
            openNotification('error', 'Помилка', result.message);
            this.setState({
                loading: false,
                processWorking: false,
            });
            return false;
        }

        const actualPricesD = [];

        for (const key in result.data) {
            const element = result.data[key];

            try {
                // eslint-disable-next-line no-await-in-loop
                const itemPrice = await getItemPriceById(element.winner.item.id);
                const prices = typeof itemPrice.prices === 'string' ? JSON.parse(itemPrice.prices) : itemPrice.prices;
                let { color } = element.winner.item;
                color = color.toLowerCase();
                color = color.replace(' ', '');

                const moduleRate = this.props.modules && this.props.modules['uah-credit-rate'];
                const creditToUAH = moduleRate ? moduleRate.extraData : 1;

                let actualPrice = null;
                if (prices) {
                    if (prices[color]) {
                        actualPrice = parseInt(prices[color] * creditToUAH * 100, 10) / 100;
                    }
                }
                actualPricesD.push(actualPrice);
            } catch (priceErr) {
                console.error('Price calculation error:', priceErr);
                actualPricesD.push(null);
            }
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
        this.setState({ openCount: value });
    }

    getSummAll() {
        const { prices } = this.state;
        let sum = 0.0;

        for (let index = 0; index < prices.length; index++) {
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
        const { processWorking, loading } = this.state;
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
        });
        setTimeout(() => {
            this.setState({
                loadItem: true,
                openMethod: '',
                processWorking: false,
                loading: false,
            });
        }, delayAnimation * 1000 + 2000);
    }

    async openBlockMethod(index = null) {
        const { processWorking, loading } = this.state;
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
            clicked: true,
        });

        this.setState({
            processWorking: true,
        });

        const result = await this.open();

        if (!result) {
            this.setState({ clicked: false, loading: false, processWorking: false });
            return;
        }
        this.setState({
            loadIndex: index,
        });

        setTimeout(() => {
            this.setState({
                loadAll: true,
            });
        }, 1000);

        setTimeout(() => {
            this.setState({
                openMethod: '',
                loadItem: true,
                clicked: false,
                processWorking: false,
                loading: false,
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
        openNotification('success', 'Всі предмети продано');
    }

    renderBlock() {
        const massive = [];
        const max = 22; // full 22
        const randomItemsList = this.state.randomItemsList && this.state.randomItemsList[0];

        const newMassive = [];

        if (randomItemsList && this.state.winner) {
            const { loadIndex } = this.state;
            const winIndex = this.state.winner[0] ? this.state.winner[0].winIndex : 0;
            const startRandomList = winIndex - (loadIndex || 0) - 1;
            for (
                let index = startRandomList;
                index < randomItemsList.length;
                index++
            ) {
                newMassive.push(randomItemsList[index]);
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
                    key={`block-${index}`}
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
                                    backgroundImage: `url(${this.getImagePath(item.id)})`,
                                    backgroundSize: 'contain',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                }}
                            >
                                <ItemColor color={item.color} />
                                <span>{this.getShortInfoItem(item.id, 'item_name')}</span>
                            </div>
                        )}
                    </div>
                </div>,
            );
        }

        return massive;
    }

    render() {
        const {
            load,
            loadItem,
            winner,
            loading,
            openCount,
        } = this.state;
        const { data, user } = this.props;

        return (
            <>
                {isAuthorized(user) ? (
                    <>
                        {!load && (
                            <>
                                <div className="casepage-more">
                                    <Fade>
                                        <img src={data.case_img} alt={data.case_title} />
                                    </Fade>
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
                                    <div className="casepage-buttons">
                                        <Button
                                            onClick={() => this.openScrollMethod()}
                                            size="large"
                                            type="primary"
                                            icon={<UnlockOutlined />}
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
                                                icon={<BlockOutlined />}
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
                                            icon={<ThunderboltOutlined />}
                                            className="color-orange"
                                            loading={loading}
                                        >
                                            Швидко
                                        </Button>
                                    </div>
                                </div>
                            </>
                        )}

                        {load && (
                            <div className="opencase">
                                {loadItem ? (
                                    <div className="opencase-result">
                                        {winner && winner.map((w, i) => (
                                            <div key={`winner-${i}`} className="opencase-result__item">
                                                <div
                                                    className="opencase-result__img"
                                                    style={{
                                                        backgroundImage: `url(${this.getImagePath(w.item.id)})`,
                                                        backgroundSize: 'contain',
                                                        backgroundPosition: 'center',
                                                        backgroundRepeat: 'no-repeat',
                                                        boxShadow: `inset 0px -30px 60px -30px ${getColorRariest(w.item.rare)}`,
                                                    }}
                                                />
                                                <div className="opencase-result__name">{w.item.name}</div>
                                                <span>
                                                    {w.item.rare} {w.item.type}
                                                </span>
                                                {this.state.prices && this.state.prices[i] && (
                                                    <Button
                                                        type="primary"
                                                        icon={<DollarOutlined />}
                                                        ghost
                                                        size="small"
                                                        onClick={() => this.sellItem(w.storageId, i)}
                                                        style={{ marginTop: 8 }}
                                                    >
                                                        Продати за {this.state.prices[i]} кред.
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <div className="opencase-result__buttons">
                                            <Button
                                                type="primary"
                                                icon={<SyncOutlined />}
                                                size="large"
                                                onClick={() => this.getBack()}
                                            >
                                                Спробувати ще раз
                                            </Button>
                                            <Button
                                                className="buttons-back"
                                                type="primary"
                                                icon={<RollbackOutlined />}
                                                size="large"
                                                danger
                                                onClick={() => window.history.back()}
                                            >
                                                Повернутися назад
                                            </Button>
                                            {this.state.prices && this.state.prices.length > 1 && this.getSummAll() && (
                                                <Button
                                                    type="primary"
                                                    icon={<DollarOutlined />}
                                                    ghost
                                                    size="large"
                                                    onClick={() => this.sellItemAll()}
                                                >
                                                    Продати все за {this.getSummAll()} кред.
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Zoom left>
                                            <div className="opencase-titlecrate">
                                                Відкриття
                                                {' '}
                                                <span>{data.case_title || 'Кейс'}</span>
                                            </div>
                                        </Zoom>
                                        <Zoom right>
                                            <div className="case-overlay" />
                                        </Zoom>

                                        {this.state.openMethod === 'block' ? (
                                            <div className="opencase-blocklist">
                                                {this.renderBlock()}
                                            </div>
                                        ) : (
                                            <>
                                                {winner && winner[0] && winner[0].item && (
                                                    <Fade delay={delayAnimation * 1000 + 500}>
                                                        <div className="opencase-titleitem">
                                                            {winner[0].item.name}
                                                            <span>
                                                                {winner[0].item.rare}
                                                                {' '}
                                                                {winner[0].item.type}
                                                            </span>
                                                        </div>
                                                    </Fade>
                                                )}

                                                {winner && this.state.randomItemsList && this.state.randomItemsList.map((randomList, listIndex) => (
                                                    <div key={`case-block-${listIndex}`} className="opencase-block">
                                                        <div className="line-overlay" />

                                                        <ShadowOverlay
                                                            className="shadow-overlay"
                                                            load={this.state.openMethod === 'scroll'}
                                                            left={calculatePositionForLine(winner[listIndex])}
                                                        >
                                                            {randomList.map((item, i) => (
                                                                <div
                                                                    key={`scroll-item-${listIndex}-${i}`}
                                                                    className={`casepage-itemlist_item rc-${item.rare}`}
                                                                    style={{
                                                                        backgroundImage: `url(${this.getImagePath(item.id)})`,
                                                                        backgroundSize: 'contain',
                                                                        backgroundPosition: 'center',
                                                                        backgroundRepeat: 'no-repeat',
                                                                        height: '110px',
                                                                        width: '130px',
                                                                        margin: '0 5px'
                                                                    }}
                                                                >
                                                                    <span>{item.name}</span>
                                                                    <ItemColor color={item.color} />
                                                                </div>
                                                            ))}
                                                        </ShadowOverlay>
                                                    </div>
                                                ))}
                                            </>
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
                                <img src={data.case_img} alt={data.case_title} />
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
                                icon={<ThunderboltOutlined />}
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

export default connect(mapStateToProps, mapDispatchToProps)(OpenCase);


