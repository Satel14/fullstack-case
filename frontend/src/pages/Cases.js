import React from "react";
import Case from "./../components/mini/Case";
import testCaseList from "../data/testCaseList";
import Flip from "react-reveal/Flip";
import { Divider } from "antd";
import H2A from "../components/mini/H2A";
export default class Class extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            fetching: 0
        }
    }
    render() {
        return (
            <>
                <div className="caselist">
                    <H2A title="Кращі" subTitle=" Кейси" />
                    {testCaseList.map((item, i) => (
                        <>
                            {i < 10 && (
                                <Flip bottom delay={i * 100}>
                                    <Case data={item} />
                                </Flip>
                            )}
                        </>
                    ))}
                </div>
                <div className="caselist">
                    <H2A title="Нові" subTitle=" Кейси" />
                    {testCaseList.map((item, i) => (
                        <>
                            {i < 10 && (
                                <Flip bottom delay={i * 100}>
                                    <Case data={item} />
                                </Flip>
                            )}
                        </>
                    ))}
                </div>
                <div className="caselist">
                    <H2A title="Кращі" subTitle=" Кейси" />
                    {testCaseList.map((item, i) => (
                        <>
                            {i < 4 && (
                                <Flip bottom delay={i * 100}>
                                    <Case data={item} />
                                </Flip>
                            )}
                        </>
                    ))}
                </div>
            </>
        )
    }
}