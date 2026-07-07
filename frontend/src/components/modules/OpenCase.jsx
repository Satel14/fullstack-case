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
import { withTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { isAuthorized } from '../../helpers/Player';
import { openCaseById } from '../../api/all/cases';
import { sellItemByStorageId } from '../../api/all/storage';
import { getItemPriceById } from '../../api/all/item';
import openNotification from '../mini/openNotification';
import { itemInfoFetch } from '../../store/actions/itemCache';
import ItemColor from '../mini/ItemColor';

const delayAnimation = 4;

const recenterDuration = 0.6;

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
const recenterTo = (from, to) => keyframes`
  0% {
    transform: translateX(${from}px)
  }
  100% {
    transform: translateX(${to}px)
  }
`;
const ShadowOverlay = styled.div`
  display: flex;
  flex-direction: row;
  width: max-content;
  transform: translateX(${(p) => {
      if (p.recenter) return p.center;
      return p.load ? p.spin : 140;
  }}px);
  animation-timing-function: ease;
  animation: ${(p) => {
      if (p.recenter) return recenterTo(p.spin, p.center);
      return p.load ? moveHorizontally(p.spin) : 'none';
  }}
    ${(p) => (p.recenter ? recenterDuration : delayAnimation)}s ease;
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
const WIDTH_ONE_BLOCK = 140;

const computePositions = (winnerList, blockWidth) => winnerList.map((winner) => {
    const center = blockWidth / 2
        - WIDTH_ONE_BLOCK * (winner.winIndex - 1)
        - WIDTH_ONE_BLOCK / 2;
    return {
        spin: center + randomInteger(-55, 55),
        center,
    };
});

class OpenCase extends Component {
    constructor(props) {
        super(props);
        this.state = {
            openMethod: '',
            randomItemsList: [],
            winner: null,
            positions: [],
            recenter: false,
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

        this.blockRef = React.createRef();
        this.timers = [];
        this.rafId = null;
        this._mounted = false;
    }

    componentDidMount() {
        this._mounted = true;
    }

    componentWillUnmount() {
        this._mounted = false;
        this.clearTimers();
    }

    clearTimers() {
        this.timers.forEach((id) => clearTimeout(id));
        this.timers = [];
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    safeSetState(patch) {
        if (this._mounted) {
            this.setState(patch);
        }
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

        this.clearTimers();
        this.setState({
            processWorking: true,
            loading: true,
        });

        const result = await this.open();

        if (!result) {
            return;
        }

        this.timers.push(setTimeout(() => {
            this.safeSetState({
                load: true,
                openMethod: '',
                loadItem: true,
                processWorking: false,
                loading: false,
            });
        }));
    }

    getBack() {
        this.clearTimers();
        this.setState({
            openMethod: '',
            load: false,
            randomItemsList: [],
            winner: null,
            positions: [],
            recenter: false,
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
                if (window.HeaderSecond) {
                    window.HeaderSecond.changeBalance(result.balance);
                }
                if (notify) {
                    openNotification('success', this.props.t('openCase.sold'));
                }
                delete prices[i];
                this.setState({
                    prices,
                });
                return;
            }
            if (notify) {
                openNotification('error', this.props.t('openCase.sellErrorTitle'), result.message || this.props.t('openCase.sellErrorText'));
            }
        } catch (e) {
            if (notify) {
                openNotification('error', this.props.t('common.error'), this.props.t('openCase.sellErrorText'));
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
                    this.props.t('openCase.limitReached'),
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
                    this.props.t('openCase.limitExceededTitle'),
                    this.props.t('openCase.limitExceededText', { remaining }),
                );
                return false;
            }
        }

        const result = await openCaseById(
            data.case_id,
            requestCount,
        ).then((res) => res).catch((err) => {
            openNotification('error', this.props.t('common.error'), this.props.t('openCase.authOrFunds'));
            this.setState({
                loading: false,
                processWorking: false,
            });
            return null;
        });

        if (!result) return false;

        if (!result.balance && result.balance !== 0) {
            openNotification('error', this.props.t('common.error'), result.message);
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

        this.clearTimers();
        this.setState({
            processWorking: true,
            loading: true,
        });

        const result = await this.open();

        if (!result) {
            return;
        }

        this.setState({
            load: true,
            recenter: false,
            positions: [],
        });

        this.rafId = requestAnimationFrame(() => {
            const blockWidth = this.blockRef.current ? this.blockRef.current.offsetWidth : 800;
            this.safeSetState({
                positions: computePositions(this.state.winner, blockWidth),
                openMethod: 'scroll',
            });
        });

        this.timers.push(setTimeout(() => {
            this.safeSetState({ recenter: true });
        }, delayAnimation * 1000));

        this.timers.push(setTimeout(() => {
            this.safeSetState({
                loadItem: true,
                openMethod: '',
                processWorking: false,
                loading: false,
            });
        }, delayAnimation * 1000 + 2000));
    }

    async openBlockMethod(index = null) {
        const { processWorking, loading } = this.state;
        if (processWorking || loading) {
            return;
        }

        this.clearTimers();
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

        this.timers.push(setTimeout(() => {
            this.safeSetState({
                loadAll: true,
            });
        }, 1000));

        this.timers.push(setTimeout(() => {
            this.safeSetState({
                openMethod: '',
                loadItem: true,
                clicked: false,
                processWorking: false,
                loading: false,
            });
        }, 3000));
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
        openNotification('success', this.props.t('openCase.allSold'));
    }

    renderBlock() {
        const massive = [];
        const max = 22;
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
        const { data, user, t } = this.props;

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
                                            {t('openCase.open')}
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
                                                {t('openCase.openBlocks')}
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
                                            {t('openCase.fast')}
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
                                                        {t('openCase.sellFor', { price: this.state.prices[i] })}
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
                                                {t('openCase.tryAgain')}
                                            </Button>
                                            <Button
                                                className="buttons-back"
                                                type="primary"
                                                icon={<RollbackOutlined />}
                                                size="large"
                                                danger
                                                onClick={() => window.history.back()}
                                            >
                                                {t('openCase.goBack')}
                                            </Button>
                                            {this.state.prices && this.state.prices.length > 1 && this.getSummAll() && (
                                                <Button
                                                    type="primary"
                                                    icon={<DollarOutlined />}
                                                    ghost
                                                    size="large"
                                                    onClick={() => this.sellItemAll()}
                                                >
                                                    {t('openCase.sellAllFor', { sum: this.getSummAll() })}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Zoom left>
                                            <div className="opencase-titlecrate">
                                                {t('openCase.opening')}
                                                {' '}
                                                <span>{data.case_title || t('openCase.caseFallback')}</span>
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

                                                {winner && this.state.randomItemsList && this.state.randomItemsList.map((randomList, listIndex) => {
                                                    const pos = this.state.positions[listIndex] || { spin: 140, center: 140 };
                                                    return (
                                                    <div
                                                        key={`case-block-${listIndex}`}
                                                        className="opencase-block"
                                                        ref={listIndex === 0 ? this.blockRef : null}
                                                    >
                                                        <div className="line-overlay" />

                                                        <ShadowOverlay
                                                            className="shadow-overlay"
                                                            load={this.state.openMethod === 'scroll'}
                                                            recenter={this.state.recenter}
                                                            spin={pos.spin}
                                                            center={pos.center}
                                                        >
                                                            {randomList.map((item, i) => (
                                                                <div
                                                                    key={`scroll-item-${listIndex}-${i}`}
                                                                    className={`casepage-itemlist_item rc-${item.rare}`}
                                                                    style={{ backgroundImage: `url(${this.getImagePath(item.id)})` }}
                                                                >
                                                                    <span>{item.name}</span>
                                                                    <ItemColor color={item.color} />
                                                                </div>
                                                            ))}
                                                        </ShadowOverlay>
                                                    </div>
                                                    );
                                                })}
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
                                message={t('openCase.authRequired')}
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
                                {t('openCase.authorize')}
                            </Button>
                        </Link>
                    </>
                )}
            </>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withTranslation()(OpenCase));


