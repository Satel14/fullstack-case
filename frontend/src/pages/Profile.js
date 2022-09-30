import React, { Component } from "react";
import testCase from "./../data/testCase";
import Fade from "react-reveal/Fade";
import Zoom from "react-reveal/Zoom";
import { Tooltip, Button, Tabs } from "antd";
import OpenCase from "./../components/modules/OpenCase";
import { HistoryOutlined, AndroidOutlined } from "@ant-design/icons";
import Loader from "../components/mini/Loader";
const { TabPane } = Tabs;

export default class Profile extends Component {
    constructor(props) {
        super(props);
        this.state = {
            id: props.match.params.id,
            case: testCase[0],
            fetching: true,
        };
    }

    renderItemProp(item) {
        return (
            "Назва: " +
            item.name +
            ", Тип: " +
            item.type +
            ", Рарність: " +
            item.rare +
            ", Колір: " +
            item.painted
        );
    }

    componentDidMount() {
        setTimeout(() => {
            this.setState({
                fetching: false,
            })
        }, 2000)
    }
    render() {
        return (
            <div className="profile">
                <h1 className="title">Профіль</h1>
                {this.state.fetching ? (
                    <Loader />
                ) : (
                    <>
                        <div className="profilepage-firstblock">
                            <div className="profilepage-firstblock__favoritecase">
                                <div className="profiletitle">Улюблений кейс</div>
                                <img src="img/case/richboycase.png" alt="кейс" />
                                <span>Rich boy case</span>
                            </div>
                            <div className="profilepage-firstblock__stats">
                                <div className="profiletitle">Satel</div>
                                <div className="profilpage-firstblock__stats__logo"
                                    style={{ backgroundImage: "url(/img/avatars/6.png)" }}
                                ></div>
                                <div className="profilpage-firstblock__stats__info">
                                    <div>
                                        Кейси
                                        <span>555</span>
                                    </div>
                                    <div>
                                        Кейси
                                        <span>555</span>
                                    </div>
                                </div>
                            </div>
                            <div className="profilepage-firstblock__bestdrop">
                                <div className="profiletitle">Найкращий дроп</div>
                                <div className="profilepage-firstblock__bestdrop__drop"
                                    style={{ backgroundImage: "url(/img/items/9.png)" }}
                                ></div>
                                <span>Fuel injector</span>
                            </div>
                        </div>
                        <div className="profilepage-secondblock">
                            <Tabs defaultActiveKey="1" centered size="large">
                                <TabPane
                                    tab={
                                        <span>
                                            <HistoryOutlined />
                                        </span>
                                    }
                                    key='1'
                                >
                                    <div className="casehistory-itemlist">
                                        {this.state.case.items.map((item, i) => (
                                            <Fade delay={i * 50}>
                                                <Tooltip placement="bottom" title={this.renderItemProp(item)}>
                                                    <div className="casehistory-itemlist_item" style={{
                                                        backgroundImage: "url(" + item.img + ")",
                                                    }}>
                                                        <span>{item.name}</span>
                                                    </div>
                                                </Tooltip>
                                            </Fade>
                                        ))}
                                    </div>
                                </TabPane>
                            </Tabs>
                        </div>
                    </>
                )}
            </div>
        )
    }
}