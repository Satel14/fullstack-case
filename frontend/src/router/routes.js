import React from 'react';
import { Redirect } from 'react-router-dom';
import Layout from '../Layout.jsx';
import Article from '../pages/Article';
import Case from '../pages/Case';
import Cases from '../pages/Cases';
import ErrorPage from '../pages/ErrorPage';
import Login from '../pages/Auth/Login.jsx';
import Registration from '../pages/Auth/Registration.jsx';
import Settings from '../pages/Settings';
import Profile from '../pages/Profile';

export default {
    private: [
        {
            path: '/settings',
            exact: true,
            layout: Layout,
            breadcrumb: 'Налаштування',
            component: Settings,
        },
    ],
    public: [
        {
            path: '/',
            layout: Layout,
            component: Cases,
            breadcrumb: 'Головна',
            exact: true,
        },
        {
            path: '/login',
            layout: Layout,
            component: Login,
            breadcrumb: 'Авторизація',
            exact: true,
        },
        {
            path: '/registration',
            layout: Layout,
            component: Registration,
            breadcrumb: 'Registration',
            exact: true,
        },
        {
            path: '/404',
            layout: Layout,
            component: ErrorPage,
            breadcrumb: 'Сторінка не найдена',
            exact: true,
        },
        {
            path: '/article/:id',
            layout: Layout,
            breadcrumb: 'Cтаття',
            component: Article,
        },
        {
            path: '/article',
            exact: true,
            layout: Layout,
            breadcrumb: 'Кейси',
            component: () => <Redirect to="/404"/>,
        },
        {
            path: '/case/:id',
            layout: Layout,
            breadcrumb: 'Кейс',
            component: Case,
        },
        {
            path: '/case',
            exact: true,
            layout: Layout,
            breadcrumb: 'Кейси',
            component: () => <Redirect to="/"/>,
        },
        {
            path: '/profile/:id',
            layout: Layout,
            breadcrumb: 'Профіль',
            component: Profile,
        },
        {
            path: '/profile',
            exact: true,
            layout: Layout,
            breadcrumb: 'Профіль',
            component: () => <Redirect to="/404"/>,
        }
    ]
};
