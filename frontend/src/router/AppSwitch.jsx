import React, { useMemo } from 'react';
import {
    Redirect, Route, Switch, useLocation,
} from 'react-router-dom';
import { isAuthorized } from '../helpers/Player';
import { isAdmin } from '../helpers/permissions';
import Loader from '../components/mini/Loader';
import ErrorBoundary from '../components/ErrorBoundary';
import DocumentTitle from '../components/DocumentTitle';

const allowed = (group, user) => (group === 'admin' ? isAdmin(user) : isAuthorized(user));

const AppSwitch = ({
    routes, user, sessionChecked, fallback: Fallback,
}) => {
    const { pathname } = useLocation();
    const allRoutes = useMemo(() => [...routes.public, ...routes.private, ...routes.admin], [routes]);
    const gate = (group, Page) => ({ history, location, match }) => {
        if (!sessionChecked) {
            return <Loader />;
        }
        if (allowed(group, user)) {
            return <Page history={history} location={location} match={match} />;
        }
        if (group === 'private') {
            return <Redirect to={{ pathname: '/login', state: { from: location } }} />;
        }
        return <Fallback history={history} location={location} match={match} />;
    };

    return (
        <ErrorBoundary resetKey={pathname}>
            <DocumentTitle routes={allRoutes} />
            <Switch>
                {routes.public.map((route) => (
                    <Route
                        key={`public-${route.path}`}
                        path={route.path}
                        exact={route.exact}
                        component={route.component}
                    />
                ))}
                {['private', 'admin'].flatMap((group) => routes[group].map((route) => (
                    <Route
                        key={`${group}-${route.path}`}
                        path={route.path}
                        exact={route.exact}
                        render={gate(group, route.component)}
                    />
                )))}
                <Route key="404-fallback" component={Fallback} />
            </Switch>
        </ErrorBoundary>
    );
};

export default AppSwitch;
