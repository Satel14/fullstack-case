import React from "react";
import Case from "./../components/mini/Case";
import testCaseList from "../data/testCaseList";
import Flip from "react-reveal/Flip";

export default class Class extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            fetching: 0
        }
    }
    render() {
        return (
            <div className="caselist">
                {testCaseList.map((item, i) => (
                    <Flip bottom delay={i * 100}>
                        <Case data={item} />
                    </Flip>
                ))}
            </div>
        )
    }
}