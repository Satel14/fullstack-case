import React, { Component } from "react";
import testCase from "../data/testCase";
import Fade from "react-reveal/Fade";
import Zoom from "react-reveal/Zoom";
import { Tooltip, Button } from "antd";
import testOpenCase from '../data/testOpenCase'
import styled, { keyframes } from 'styled-components'
import rariestColors from '../data/itemConfig'
import {
    SyncOutlined,
    DollarOutlined,
    RollbackOutlined,
} from "@ant-design/icons";

const delayAnimation = 4

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
  animation: ${(p) => (p.load ? moveVertically(p.top) : "none")}
    ${delayAnimation}s ease;
  animation-fill-mode: forwards;
`;
export default class Test extends Component {
    constructor(props) {
        super(props);
        this.state = {
            id: props.match.params.id,
            case: testOpenCase.resultWithItem,
            winner: testOpenCase.winner,
            fetching: 0,
            load: false,
            loadItem: false,
        };
    }

    calculatePositionForLine() {
        const heightOneBlock = 110;
        const resultTopPixel =
            -heightOneBlock * (this.state.winner.winIndex - 1) +
            270 +
            this.state.winner.winIndex -
            this.randomInteger(5, heightOneBlock - 5);

        return resultTopPixel;
    }

    Click() {
        this.setState({
            load: true,
        });
        setTimeout(() => {
            this.setState({
                loadItem: true,
            })
        }, delayAnimation * 1000 + 1000)
    }

    randomInteger = (min, max) => {
        let rand = min + Math.random() * (max + 1 - min);
        return Math.floor(rand);
    };

    getColorRariest(rariest) {
        return rariestColors[rariest];
    }

    render() {
        return (
            <>
                <Button
                    onClick={() => this.Click()}
                    style={{ position: "absolute", zIndex: 10 }}
                >Відрити
                </Button>
                <div className="opencase">
                    {this.state.loadItem ? (
                        <div className="opencase-result">
                            <div className="opencase-result__img"
                                style={{
                                    backgroundImage: `url(/img/items/${this.state.winner.item.id}.png)`,
                                    boxShadow: "inset 0px -30px 60px -30px" + this.getColorRariest(this.state.winner.item.rare),
                                }}
                            />
                            {this.state.winner.item.name}
                            <span>
                                {this.state.winner.item.rare} {this.state.winner.item.type}
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
                                    obClick={()=> window.history.back()}
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
                                    Відкриття <span>Кейс - Prime</span>
                                </div>
                            </Zoom>
                            <Zoom right>
                                <div className="opencase-overlay">
                                    <Fade delay={delayAnimation * 1000 + 500}>
                                        <div className="opencase-titleitems">
                                            {this.state.winner.item.name}
                                            <span>
                                                {this.state.winner.item.rare} {this.state.winner.item.type}
                                            </span>
                                        </div>
                                    </Fade>
                                    <div className="opencase-block">
                                        <div className="line-overlay"></div>
                                        <div className="shadow-overlay">
                                            <ShadowOverlay
                                                load={this.state.load}
                                                top={this.calculatePositionForLine()}
                                            >
                                                {this.state.case.map((item, i) => (
                                                    <>
                                                        <div className={i === this.state.winner.winIndex - 1 ? "item active" : "item"}
                                                            style={{
                                                                backgroundImage: `url(/img/items/${item.id}.png)`,
                                                                boxShadow: "inset 0px -30px 60px -30px" + this.getColorRariest(item.rare)
                                                            }}
                                                            key={`openedItem` + i} ></div>
                                                    </>
                                                ))}
                                            </ShadowOverlay>
                                        </div>
                                    </div>
                                </div>
                            </Zoom>
                        </>
                    )}
                </div>
            </>
        )
    }
}