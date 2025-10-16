import React, { Component } from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import map from 'lodash/map';
import routes from './routes';
import Layout from '../Layout.jsx';
import { connect } from 'react-redux';
import { isAuthorized } from '../helpers/Player';
import Banned from '../components/Banned';
import ErrorPage from '../pages/ErrorPage';
import { getProfileFetch } from '../store/actions/user';
import roles from '../enum/role';
import { getAllModules } from '../store/actions/module';

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
        try {
            await this.props.getAllModules();
            this.updateOnline();
            await this.props.getProfileFetch();
        } catch (error) {
            console.error('Error fetching modules or profile:', error);
        }
    }


    updateOnline() {
        const { user } = this.props;
        if (isAuthorized(user)) {
            console.log('profileIsOnline');
        }
    }

    render() {

        const { user } = this.props;
        console.log(user);
        if (isAuthorized(user)) {
            if (roles.BANNED === user.role) {
                return <Banned/>;
            }
        }
        return (
            <BrowserRouter>
                <Layout>
                    <Switch>
                        {map(routes.public, (route) => (
                            <Route
                                key={`public-${route.path}`}
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
                                {map(routes.private, (route) => (
                                    <Route
                                        key={`private-${route.path}`}
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
                        <Route key="404-fallback" component={ErrorPage}/>
                    </Switch>
                </Layout>
            </BrowserRouter>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(RouterLayout);
