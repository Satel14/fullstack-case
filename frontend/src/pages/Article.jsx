import React, { Component } from 'react';
import Fade from 'react-reveal/Fade';
import { Collapse } from 'antd';
import map from 'lodash/map';
import testArticle from '../data/testArticle';

const { Panel } = Collapse;

const text = 'lorem lorem lorem lorem lorem lorem lorem lorem lorem';
export default class Article extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [testArticle[0]],
        };
    }

    render() {
        const { data } = this.state;
        return (
            <div className="articlepage">
                <Collapse>
                    <Panel header="This is panel header 1" key="1">
                        <p>{text}</p>
                    </Panel>
                    <Panel header="This is panel header 2" key="2">
                        <p>{text}</p>
                    </Panel>
                    <Panel header="This is panel header 3" key="3">
                        <p>{text}</p>
                    </Panel>
                </Collapse>
                {map(data, (item) => (
                    <Fade>
                        <h1 className="title">{item.name}</h1>
                        <div className="articlepage-content">
                            <div
                            // eslint-disable-next-line react/no-danger
                                dangerouslySetInnerHTML={{
                                    __html: item.text,
                                }}
                            />
                        </div>
                    </Fade>
                ))}
            </div>
        );
    }
}
