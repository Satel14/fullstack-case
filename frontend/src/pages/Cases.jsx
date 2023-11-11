import React, { Component } from 'react';
import Flip from 'react-reveal/Flip';
import map from 'lodash/map';
import Case from '../components/mini/Case';
import testCaseList from '../data/testCaseList';
import H2A from '../components/mini/H2A';
import collectionCase from '../data/collectionCase';

export default class Cases extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // fetching: 0,
        };
    }

    render() {
        return (
            <>
                <H2A title="Кращі" subTitle=" Кейси" />
                <div className="caselist">
                    {map(testCaseList, (item, i) => (
                        <>
                            {i < 100 && (
                                <Flip bottom delay={i * 100}>
                                    <Case data={item} />
                                </Flip>
                            )}
                        </>
                    ))}
                </div>
                <H2A title="Нові" subTitle=" Кейси" />
                <div className="caselist">
                    {map(testCaseList, (item, i) => (
                        <>
                            {i < 10 && (
                                <Flip bottom delay={i * 100}>
                                    <Case data={item} />
                                </Flip>
                            )}
                        </>
                    ))}
                </div>
                <H2A title="Кращі" subTitle=" Кейси" />
                <div className="caselist">
                    {map(testCaseList, (item, i) => (
                        <>
                            {i < 4 && (
                                <Flip bottom delay={i * 100}>
                                    <Case data={item} />
                                </Flip>
                            )}
                        </>
                    ))}
                </div>
                <H2A title="Колекційні" subTitle="Кейси" />
                <div className="caselist">
                    {map(collectionCase, (item, i) => (
                        <>
                            {i < 40 && (
                                <Flip bottom delay={i * 100}>
                                    <Case data={item} />
                                </Flip>
                            )}
                        </>
                    ))}
                </div>
            </>
        );
    }
}
