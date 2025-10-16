import React from 'react';
import { Redirect } from 'react-router-dom';
import Layout from '../Layout.jsx';
import Article from '../pages/Article';
import Cases from '../pages/Cases';
import Case from '../pages/Case';
import ErrorPage from '../pages/ErrorPage';
import Login from '../pages/Auth/Login.jsx';
import Registration from '../pages/Auth/Registration.jsx';
import Promocode from '../pages/Promocode';
import Profile from '../pages/Profile';
import Deposit from '../pages/Deposit';
import Inventory from '../pages/Inventory';
import Top from '../pages/Top';

export default {
    private: [
        {
            path: '/settings',
            exact: true,
            layout: Layout,
            breadcrumb: 'Промокоди',
            component: Promocode,
        },
        {
            path: '/deposit',
            exact: true,
            layout: Layout,
            breadcrumb: 'Поповнити рахунок',
            component: Deposit,
        },
        {
            path: '/inventory',
            exact: true,
            layout: Layout,
            breadcrumb: 'Налаштування',
            component: Inventory,
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
        },
        {
            path: '/top',
            exact: true,
            layout: Layout,
            breadcrumb: 'ТОП 50 гравців',
            component: Top,
        }
    ]
};
