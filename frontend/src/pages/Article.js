import React, { Component } from "react";
import testArticle from '../data/testArticle'
import Fade from 'react-reveal/Fade'
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
                {this.state.data.map((item, i) =>
                (
                    <Fade>
                        <h1>{item.name}</h1>
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