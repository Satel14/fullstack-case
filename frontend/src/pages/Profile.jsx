import React, { Component } from 'react';
import Fade from 'react-reveal/Fade';
import { Tooltip, Tabs } from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import testCase from '../data/testCase';
import Loader from '../components/mini/Loader';
import { connect } from 'react-redux';
import { itemInfoFetch } from '../store/actions/itemCache';
import { Link } from 'react-router-dom';

const mapStateToProps = (state) => ({
    itemCache: state.itemCache,
    user: state.user,
})

const mapDispatchToProps = (dispatch) => ({
    itemInfoFetch: (id) => dispatch(itemInfoFetch(id)),
});

class Profile extends Component {
    constructor(props) {
        super(props);
        this.state = {
            // id: props.match.params.id,
            case: testCase[0],
            fetching: true,
            favoriteCase: testCase[0] || {},
            caseCollection: [],
        };
        this.timeoutId = null;
    }

    componentDidMount() {
        this.timeoutId = setTimeout(() => {
            if (this._isMounted) {
                this.setState({
                    fetching: false,
                });
            }
        }, 2000);
        this._isMounted = true;
    }

    componentWillUnmount() {
        this._isMounted = false;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    render() {
        const { fetching, caseCollection, favoriteCase } = this.state;
        console.log(favoriteCase, 'favoriteCase');
        return (
            <div className="profilepage">
                <h1 className="title">Профіль</h1>
                {fetching ? (
                    <Loader />
                ) : (
                    <>
                        <div className="profilepage-firstblock">
                            <div className="profilepage-firstblock__favoritecase">
                                <div className="profiletitle">Улюблений кейс</div>
                                <Link to={`/case/${favoriteCase.case_id}`}>
                                    <img src={favoriteCase.case_img} alt="кейс"/>
                                    <span>{favoriteCase.case_title}</span>
                                </Link>
                            </div>
                            <div className="profilepage-firstblock__stats">
                                <div className="profiletitle">Satel</div>
                                <div
                                    className="profilpage-firstblock__stats__logo"
                                    style={{ backgroundImage: 'url(/img/avatars/6.png)' }}
                                />
                                <div className="profilpage-firstblock__stats__info">
                                    <div>
                                        Кейси
                                        <span>555</span>
                                    </div>
                                    <div>
                                        Кейси
                                        <span>555</span>
                                    </div>
                                </div>
                            </div>
                            <div className="profilepage-firstblock__bestdrop">
                                <div className="profiletitle">Найкращий дроп</div>
                                <div
                                    className="profilepage-firstblock__bestdrop__drop"
                                    style={{ backgroundImage: 'url(/img/items/9.png)' }}
                                />
                                <span>Fuel injector</span>
                            </div>
                        </div>
                        <div className="profilepage-secondblock">
                            <Tabs 
                                defaultActiveKey="1" 
                                centered 
                                size="large"
                                items={[
                                    {
                                        key: '1',
                                        label: (
                                            <span>
                                                <HistoryOutlined />
                                            </span>
                                        ),
                                        children: (
                                            <div className="casehistory-itemlist">
                                                {/* {map(caseCollection.items, (item, i) => ( */}
                                                {/*     <Fade delay={i * 50}> */}
                                                {/*         <Tooltip placement="bottom" title={renderItemProp(item)}> */}
                                                {/*             <div */}
                                                {/*                 className="casehistory-itemlist_item" */}
                                                {/*                 style={{ */}
                                                {/*                     backgroundImage: `url(${item.img})`, */}
                                                {/*                 }} */}
                                                {/*             > */}
                                                {/*                 <span>{item.name}</span> */}
                                                {/*             </div> */}
                                                {/*         </Tooltip> */}
                                                {/*     </Fade> */}
                                                {/* ))} */}
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </div>
                    </>
                )}
            </div>
        );
    }
}


export default connect(mapStateToProps, mapDispatchToProps)(Profile);