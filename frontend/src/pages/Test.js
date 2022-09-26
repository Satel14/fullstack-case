import React, { Component } from "react";
import testCase from "./../data/testCase";
import Fade from "react-reveal/Fade";
import Zoom from "react-reveal/Zoom";
import { Tooltip, Button } from "antd";

export default class Test extends Component {
    constructor(props) {
        super(props);
        this.state = {
            id: props.match.params.id,
            case: testCase[0],
            fetching: 0,
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

    render() {
        return (
            <div className="opencase">
                <Zoom left>
                    <div className="opencase-titlecreate">
                        Відкриття <span>Кейс - Case Snow</span>
                    </div>
                </Zoom>
                <Fade delay={600}>
                    <div className="opencase-titlecreate">
                        Hyper Beast <span>classified</span>
                    </div>
                </Fade>
                <Zoom right>
                    <div className="case-overlay">
                    </div>
                </Zoom>
                <div className="opencase-block">
                    <div className="line-overlay"></div>
                    <div className="shadow-overlay">
                        {this.state.case.items.map((item, i) => (
                            <>
                                <div className={i === 3 ? 'item active' : "item"}
                                    style={{
                                        backgroundImage: "url(" + "https://i.pravatar.cc/150?img=9" + ")",
                                    }}
                                >
                                </div>
                                <div
                                    className={i === 3 ? "item active" : "item "}
                                    style={{
                                        backgroundImage:
                                            "url(" + "https://i.pravatar.cc/150?img=11" + ")",
                                    }}
                                >
                                </div>
                            </>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
}