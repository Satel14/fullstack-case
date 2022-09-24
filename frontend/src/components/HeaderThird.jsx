import React from 'react'
import { Layout, Tooltip } from "antd";
import testCase from '../data/testCase'
import Fade from "react-reveal/Fade";


const { Header } = Layout;

export default class HeaderThird extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            case: testCase[0],
            fetching: 0,
        }
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

    getColor(paint) {
        let color;

        if (paint === "tw") {
            color = "white";
        } else if (paint === "cobalt") {
            color = "blue";
        } else if (paint === "very rare") {
            color = "blue";
        } else if (paint === "exotic") {
            color = "yellow";
        } else {
            color = "grey";
        }

        return color;
    }
    render() {
        return (
            <Header className='headersecond third'>
                {this.state.case.items.map((item, i) =>
                    <>
                        {i < 17 && (
                            <Fade delay={i * 50}>
                                <Tooltip placement='bottom' title={this.renderItemProp(item)}>
                                    <div className='casepage-itemlist__item'
                                        style={{
                                            backgroundImage: "url(" + item.img + ")",
                                            borderColor: this.getColor(item.painted)
                                        }}
                                    >
                                    </div>
                                </Tooltip>
                            </Fade>
                        )}
                    </>
                )}
            </Header>
        )
    }
}