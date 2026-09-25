import React from 'react';
import { Route, Switch } from 'react-router-dom';
import { isAuthorized } from '../helpers/Player';
import { isAdmin } from '../helpers/permissions';

const routeGroups = (routes, user) => [
    ['public', routes.public],
    ['private', isAuthorized(user) ? routes.private : []],
    ['admin', isAdmin(user) ? routes.admin : []],
];

const AppSwitch = ({ routes, user, fallback }) => (
    <Switch>
        {routeGroups(routes, user).flatMap(([group, groupRoutes]) => groupRoutes.map((route) => (
            <Route
                key={`${group}-${route.path}`}
                path={route.path}
                exact={route.exact}
                component={route.component}
            />
        )))}
        <Route key="404-fallback" component={fallback}/>
    </Switch>
);

export default AppSwitch;
