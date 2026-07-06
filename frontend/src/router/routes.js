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
import PaymentGateway from '../pages/PaymentGateway';
import Settings from '../pages/Settings.jsx';
import Top from '../pages/Top';
import Faq from '../pages/Faq';

export default {
    private: [
        {
            path: '/settings',
            exact: true,
            layout: Layout,
            component: Promocode,
        },
        {
            path: '/deposit',
            exact: true,
            layout: Layout,
            component: Deposit,
        },
        {
            path: '/payment',
            exact: true,
            layout: Layout,
            component: PaymentGateway,
        },
        {
            path: '/Settings',
            exact: true,
            layout: Layout,
            component: Settings,
        },
    ],
    public: [
        {
            path: '/',
            layout: Layout,
            component: Cases,
            exact: true,
        },
        {
            path: '/login',
            layout: Layout,
            component: Login,
            exact: true,
        },
        {
            path: '/registration',
            layout: Layout,
            component: Registration,
            exact: true,
        },
        {
            path: '/404',
            layout: Layout,
            component: ErrorPage,
            exact: true,
        },
        {
            path: '/article/:id',
            layout: Layout,
            component: Article,
        },
        {
            path: '/article',
            exact: true,
            layout: Layout,
            component: () => <Redirect to="/404"/>,
        },
        {
            path: '/case/:id',
            layout: Layout,
            component: Case,
        },
        {
            path: '/case',
            exact: true,
            layout: Layout,
            component: () => <Redirect to="/"/>,
        },
        {
            path: '/profile/:id',
            layout: Layout,
            component: Profile,
        },
        {
            path: '/profile',
            exact: true,
            layout: Layout,
            component: () => <Redirect to="/404"/>,
        },
        {
            path: '/top',
            exact: true,
            layout: Layout,
            component: Top,
        },
        {
            path: '/faq',
            exact: true,
            layout: Layout,
            component: Faq,
        },
    ],
};
