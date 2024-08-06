import React, {Component} from 'react';
import {BrowserRouter, Route, Switch} from 'react-router-dom';
import map from 'lodash/map';
import routes from './routes';
import Layout from '../Layout.tsx';
import {connect} from 'react-redux';
import {isAuthorized} from '../helpers/Player';
import Banned from '../components/Banned';
import ErrorPage from '../pages/ErrorPage';
import {getProfileFetch} from '../store/actions/user';
import roles from '../enum/role'

const mapDispatchToProps = (dispatch) => ({
    getProfileFetch: () => dispatch(getProfileFetch()),
    getAllModules: () => dispatch(getAllModules()),
});

const mapStateToProps = (state) => ({
    user: state.user,
    modules: state.modules,
});

class RouterLayout extends Component {
    constructor(props) {
        super(props);
        this.state = {
            intervalId: null,
        };
    }

    async componentDidMount() {
        this.updateOnline()

        await this.props.getProfileFetch();
    }
    updateOnline() {
        const { user } = this.props;
        if (isAuthorized(user)) {
            console.log("profileIsOnline");
        }
    }

    render() {

        const { user } = this.props;
        console.log(user);
        if (isAuthorized(user)) {
            if (roles.BANNED === user.role) {
                return <Banned />;
            }
        }
        return (
            <BrowserRouter>
                <Layout>
                    <Switch>
                        {map(routes.public, (route, index) => (
                            <Route
                                key={index}
                                path={route.path}
                                exact={route.exact}
                                breadcrumb={route.breadcrumb}
                                component={(props) => (
                                    // eslint-disable-next-line react/jsx-props-no-spreading
                                    <route.component {...props} />
                                )}
                            />
                        ))}

                        {isAuthorized(user) && (
                            <>
                                {map(routes.private, (route, index) => (
                                    <Route
                                        key={index}
                                        path={route.path}
                                        exact={route.exact}
                                        breadcrumb={route.breadcrumb}
                                        component={(props) => (
                                            // eslint-disable-next-line react/jsx-props-no-spreading
                                            <route.component {...props} />
                                        )}
                                    />
                                ))}
                            </>
                        )}
                        <Route component={ErrorPage}/>
                    </Switch>
                </Layout>
            </BrowserRouter>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(RouterLayout);
