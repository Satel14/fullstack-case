import React, { Component } from 'react';
import Fade from 'react-reveal/Fade';
import Zoom from 'react-reveal/Zoom';
import { Button } from 'antd';
import styled, { keyframes } from 'styled-components';
import {
    SyncOutlined,
    DollarOutlined,
    RollbackOutlined,
} from '@ant-design/icons';
import map from 'lodash/map';
import testOpenCase from '../../data/testOpenCase';
import rariestColors from '../../data/itemConfig';

const delayAnimation = 4;

const moveVertically = (top) => keyframes`
  0%{
    transform: translateY(-140px)
  }
  20%{
    transform: translateY(-100px)
  }
  100{
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

const getColorRariest = (rariest) => rariestColors[rariest];
export default class Test extends Component {
    constructor(props) {
        super(props);
        this.state = {
            caseCollection: testOpenCase.resultWithItem,
            winner: testOpenCase.winner,
            // fetching: 0,
            load: false,
            loadItem: false,
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

    Click() {
        this.setState({
            load: true,
        });
        setTimeout(() => {
            this.setState({
                loadItem: true,
            });
        }, delayAnimation * 1000 + 1000);
    }

    render() {
        const {
            caseCollection, load, loadItem, winner,
        } = this.state;
        return (
            <>
                {!load ? (
                    <>
                        <div className="casepage-more">
                            <Fade>
                                {`Кейс ${caseCollection.name}`}
                                <img src={caseCollection.img} alt={caseCollection.name} />
                            </Fade>
                        </div>
                        <Button
                            onClick={() => this.Click()}
                            size="large"
                            type="primary"
                            ghost
                        >
                            Відрити
                        </Button>
                    </>
                ) : (
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
                                    {' '}
                                    {winner.item.type}
                                </span>
                                <div className="opencase-result__buttons">
                                    <Button type="primary" icon={<SyncOutlined />} size="large">
                                        Спробувати ще раз
                                    </Button>
                                    <Button
                                        type="primary"
                                        icon={<RollbackOutlined />}
                                        size="large"
                                        danger
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
        );
    }
}
