import React, { Component } from 'react';
import Fade from 'react-reveal/Fade';
import { Tooltip } from 'antd';
import map from 'lodash/map';
import testCase from '../data/testCase';
import OpenCase from '../components/modules/OpenCase';

const renderItemProp = (item) => (
    `Назва: ${item.name
    }, Тип: ${item.type
    }, Рарність: ${item.rare
    }, Колір: ${item.painted}`
);

export default class Test extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // id: props.match.params.id,
            caseCollection: testCase[0],
        };
    }

    render() {
        const { caseCollection } = this.state;
        return (
            <div className="casepage">
                <div className="casepage-openbutton">
                    <OpenCase case={caseCollection} />
                </div>
                <span className="casepage-title-second">
                    Вміст кейсу
                    {' '}
                    <i>Кількість відкритих: 55</i>
                </span>
                <div className="casepage-itemlist">
                    {map(caseCollection.items, (item, i) => (
                        <Fade delay={i * 50}>
                            <Tooltip placement="bottom" title={renderItemProp(item)}>
                                <div
                                    className="casepage-itemlist_item"
                                    style={{
                                        backgroundImage: `url(${item.img})`,
                                    }}
                                >
                                    <span>{item.name}</span>
                                </div>
                            </Tooltip>
                        </Fade>
                    ))}
                </div>
            </div>
        );
    }
}
