import React from 'react';
import { Layout, Tooltip } from 'antd';
import Fade from 'react-reveal/Fade';
import map from 'lodash/map';
import testCase from '../data/testCase';

const { Header } = Layout;

const renderItemProp = (item) => (
    `Назва: ${
        item.name
    }, Тип: ${
        item.type
    }, Рарність: ${
        item.rare
    }, Колір: ${
        item.painted}`
);
const getColor = (paint) => {
    let color;

    if (paint === 'tw') {
        color = 'white';
    } else if (paint === 'cobalt') {
        color = 'blue';
    } else if (paint === 'very rare') {
        color = 'blue';
    } else if (paint === 'exotic') {
        color = 'yellow';
    } else {
        color = 'grey';
    }

    return color;
};
export default class HeaderThird extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            cases: testCase[0],
            // fetching: 0,
        };
    }

    render() {
        const { cases } = this.state;
        return (
            <Header className="headersecond third">
                {map(cases.items, (item, i) => (
                    <>
                        {i < 17 && (
                            <Fade delay={i * 50}>
                                <Tooltip placement="bottom" title={renderItemProp(item)}>
                                    <div
                                        className="casepage-itemlist__item"
                                        style={{
                                            backgroundImage: `url(${item.img})`,
                                            borderColor: getColor(item.painted),
                                        }}
                                    />
                                </Tooltip>
                            </Fade>
                        )}
                    </>
                ))}
            </Header>
        );
    }
}
