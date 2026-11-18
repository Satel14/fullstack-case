import React from 'react';
import { Redirect } from 'react-router-dom';
import Layout from '../Layout.jsx';
import Cases from '../pages/Cases';
import Case from '../pages/Case';
import ErrorPage from '../pages/ErrorPage';
import lazyPage from '../helpers/lazyPage';

const Article = lazyPage(() => import('../pages/Article'));
const Login = lazyPage(() => import('../pages/Auth/Login.jsx'));
const Registration = lazyPage(() => import('../pages/Auth/Registration.jsx'));
const ResetPassword = lazyPage(() => import('../pages/Auth/ResetPassword'));
const ConfirmEmail = lazyPage(() => import('../pages/Auth/ConfirmEmail'));
const Promocode = lazyPage(() => import('../pages/Promocode'));
const Profile = lazyPage(() => import('../pages/Profile'));
const Deposit = lazyPage(() => import('../pages/Deposit'));
const PaymentGateway = lazyPage(() => import('../pages/PaymentGateway'));
const Settings = lazyPage(() => import('../pages/Settings.jsx'));
const Top = lazyPage(() => import('../pages/Top'));
const Faq = lazyPage(() => import('../pages/Faq'));
const ProvablyFair = lazyPage(() => import('../pages/ProvablyFair'));
const Inventory = lazyPage(() => import('../pages/Inventory'));
const Admin = lazyPage(() => import('../pages/Admin'));
const Bonus = lazyPage(() => import('../pages/Bonus'));

export default {
    private: [
        {
            path: '/settings',
            exact: true,
            layout: Layout,
            component: Settings,
            titleKey: 'header.settings',
        },
        {
            path: '/promocode',
            exact: true,
            layout: Layout,
            component: Promocode,
            titleKey: 'promocode.pageTitle',
        },
        {
            path: '/deposit',
            exact: true,
            layout: Layout,
            component: Deposit,
            titleKey: 'deposit.title',
        },
        {
            path: '/payment',
            exact: true,
            layout: Layout,
            component: PaymentGateway,
            titleKey: 'payment.title',
        },
        {
            path: '/inventory',
            exact: true,
            layout: Layout,
            component: Inventory,
            titleKey: 'inventory.title',
        },
    ],
    admin: [
        {
            path: '/admin',
            exact: true,
            layout: Layout,
            component: Admin,
            titleKey: 'admin.title',
        },
    ],
    public: [
        {
            path: '/provably-fair',
            exact: true,
            layout: Layout,
            component: ProvablyFair,
            titleKey: 'provablyFair.title',
        },
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
            titleKey: 'auth.login.title',
            exact: true,
        },
        {
            path: '/registration',
            layout: Layout,
            component: Registration,
            titleKey: 'auth.register.title',
            exact: true,
        },
        {
            path: '/reset-password',
            layout: Layout,
            component: ResetPassword,
            titleKey: 'auth.reset.title',
            exact: true,
        },
        {
            path: '/confirm-email',
            layout: Layout,
            component: ConfirmEmail,
            titleKey: 'auth.confirm.title',
            exact: true,
        },
        {
            path: '/404',
            layout: Layout,
            component: ErrorPage,
            titleKey: 'error.notFound',
            exact: true,
        },
        {
            path: '/article/:id',
            layout: Layout,
            component: Article,
            titleKey: 'article.loading',
        },
        {
            path: '/article',
            exact: true,
            layout: Layout,
            component: () => <Redirect to="/404" />,
        },
        {
            path: '/case/:id',
            layout: Layout,
            component: Case,
            titleKey: 'common.case',
        },
        {
            path: '/case',
            exact: true,
            layout: Layout,
            component: () => <Redirect to="/" />,
        },
        {
            path: '/profile/:id',
            layout: Layout,
            component: Profile,
            titleKey: 'profile.title',
        },
        {
            path: '/profile',
            exact: true,
            layout: Layout,
            component: () => <Redirect to="/404" />,
        },
        {
            path: '/top',
            exact: true,
            layout: Layout,
            component: Top,
            titleKey: 'menu.topPlayers',
        },
        {
            path: '/faq',
            exact: true,
            layout: Layout,
            component: Faq,
            titleKey: 'faq.title',
        },
        {
            path: '/bonus',
            exact: true,
            layout: Layout,
            component: Bonus,
            titleKey: 'bonus.title',
        },
    ],
};
