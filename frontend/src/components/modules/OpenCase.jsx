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
import { getItemPriceById } from '../../api/all/item'
import { openCaseById } from '../../api/all/cases'
import testOpenCase from '../../data/testOpenCase';
import rariestColors from '../../data/itemConfig';
import H2A from '../mini/H2A';
import CasePrice from '../mini/CasePrice';
import openNotification from '../mini/openNotification';
import { isAuthorized } from '../../helpers/Player';
import { connect } from 'react-redux';
import Case from '../mini/Case';
import { Link } from 'react-router-dom';

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

const mapStateToProps = (state) => ({
    user: state.user,
})

const getColorRariest = (rariest) => rariestColors[rariest];
class Test extends Component {
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
    }

    calculatePositionForLine() {
        const { winner } = this.state;
        const heightOneBlock = 110;
        const resultTopPixel = -heightOneBlock * (winner.winIndex - 1)
            + 270
            + winner.winIndex
            - randomInteger(5, heightOneBlock - 5);

        return resultTopPixel;
    }
    async open() {
        const { data } = this.props;
        const { openCount } = this.state;
        if (data.case_openLimit <= data.case_openedCount && data.case_openLimit !== 0) {
            this.setState({
                load: false,
                openMethod: '',
                processWorking: false,
                loadItem: false,
                loading: false,
            })
            openNotification(
                'error',
                'У цього кейса досяг ліміт відкриття. Цей кейс більше не можна відрити!',
                );
            return false;
        }

        const result = await openCaseById(
            data.case_id,
            parseInt(openCount, 10),
        ).then((res) => res);

        if (!result) return false;

        if (!result.balance) {
            openNotification('error', 'Помилка', result.message);
            this.setState({
                loading: false,
            })
            return false;
        }

        const actualPricesD = [];

        for(const key in result.data) {
            const element = result.data[key];

            const itemPrice = await getItemPriceById(element.winner.item.id);
            const prices = JSON.parse(itemPrice.price);
            let {color} = element.winner.item;
            color = color.toLowerCase();
            color = color.replace(' ', '');

            const creditToUAH = this.props.modules['uah-credit-rate'].extraData;

            let actualPrice = null;
            if (prices) {
                if (prices[color]) {
                    actualPrice = parseInt(prices[color] * creditToUAH * 100, 10) / 100;
                }
            }
            actualPricesD.push(actualPrice)
        }

        const randomList = [];
        const winnerList = [];

        for(const key in result.data) {
            const element = result.data[key];
            randomList.push(element.resultWithItem);
            winnerList.push(element.winner)
        }
        this.setState({
            randomItemsList: randomList,
            winner: winnerList,
            price: actualPricesD,
        })

        window.HeaderSecond.changeBalance(result.balance);
        return true
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
    getLoginPage() {
        const { history } = this.props;
        if (history) {
            history.push('/login')
        }
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
        }, delayAnimation * 1000 + 1000);
    }

    onChangeRadio(e){
        const { value } = this.state;
        this.setState({openCount: value});
    }

    render() {
        const {
            caseCollection, load, loadItem, winner, openCount, loading
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
                                            {/* <H2A title="Кейс" subTitle={caseCollection.name}/> */}
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
                                                <Radio.Button value='1'>1</Radio.Button>
                                                <Radio.Button value='2'>2</Radio.Button>
                                                <Radio.Button value='3'>3</Radio.Button>
                                                <Radio.Button value='4'>4</Radio.Button>
                                                <Radio.Button value='5'>5</Radio.Button>
                                                <Radio.Button value='10'>10</Radio.Button>
                                                <Radio.Button value='20'>20</Radio.Button>
                                            </Radio.Group>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => this.openScrollMethod()}
                                        size="large"
                                        type="primary"
                                        icon={<UnlockOutlined/>}
                                        style={{marginRight: 10}}
                                        className='color-purple'
                                        loading={loading}
                                    >
                                        Відкрити
                                    </Button>
                                    {openCount === '1' && (
                                        <Button
                                            onClick={()=> this.openBlockMethod()}
                                            size="large"
                                            type="primary"
                                            icon={<BlockOutlined/>}
                                            style={{marginRight: 10}}
                                            className='color-red'
                                            loading={loading}
                                        >
                                            Відкрити блоками
                                        </Button>
                                    )}
                                    <Button
                                        onClick={() => this.openFastMethod()}
                                        size='large'
                                        type='primary'
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
                                            <Button type="primary" icon={<SyncOutlined />} size="large">
                                                Спробувати ще раз
                                            </Button>
                                            <Button
                                                className='buttons-back'
                                                type="primary"
                                                icon={<RollbackOutlined />}
                                                size="large"
                                                danger
                                                onClick={()=> window.history.back()}
                                            >
                                                Повернутися назад
                                            </Button>
                                            <Button
                                                type="primary"
                                                icon={<DollarOutlined />}
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
                                            <div className="case-overlay" />
                                        </Zoom>
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

                                        <div className="opencase-block">
                                            <div className="line-overlay" />

                                            <div className="shadow-overlay">
                                                <ShadowOverlay
                                                    load={load}
                                                    top={this.calculatePositionForLine()}
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
                                    </>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className='casepage-more'>
                            <Fade>
                               {/* <H2A title="Кейс" subTitle={data.case_title}/> */}
                               {/*  <CasePrice data={data} count={openCount}/> */}
                            </Fade>
                        </div>
                        <div className="alert-case-auth">
                            <Alert
                            message="Щоб відкрити кейс потрібно пройти авторизацію"
                            type='error'
                            showIcon
                            />
                        </div>

                        <Link to='/login'>
                            <Button
                            onClick={() => this.getLoginPage()}
                            size='large'
                            type='primary'
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

export default connect(mapStateToProps, null)(Test)
