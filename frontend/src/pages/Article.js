import React, { Component } from "react";
import testArticle from '../data/testArticle'
import Fade from 'react-reveal/Fade'
import { Collapse } from "antd";
const { Panel } = Collapse;

const text =`lorem lorem lorem lorem lorem lorem lorem lorem lorem`;
export default class Article extends Component {
    constructor(props) {
        super(props);
        this.state = {
            fetching: 0,
            data: [testArticle[0]],
        };
    }

    render() {
        return (
            <div className="articlepage">
                <Collapse>
                <Panel header="This is panel header 1">
                    <p>{text}</p>
                </Panel>
                <Panel header="This is panel header 2">
                    <p>{text}</p>
                </Panel>
                <Panel header="This is panel header 3">
                    <p>{text}</p>
                </Panel>
                </Collapse>
                {this.state.data.map((item, i) =>
                (
                    <Fade>
                        <h1 className="title">{item.name}</h1>
                        <div className="articlepage-content">
                            <div dangerouslySetInnerHTML={{
                                __html: item.text,
                            }}>
                            </div>
                        </div>
                    </Fade>
                ))}
            </div>
        );
    }
}