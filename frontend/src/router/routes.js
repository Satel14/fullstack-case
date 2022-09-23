import React from 'react'
import { Redirect } from "react-router-dom";
import Layout from "../Layout"
import Main from "./../pages/Main"
import Article from "./../pages/Article"
import Case from "./../pages/Case"
import History from "./../pages/History"

// eslint-disable-next-line import/no-anonymous-default-export
export default [
    {
        path: "/",
        layout: Layout,
        component: Main,
        breadcrumb: "Головна",
        exact: true,
    },
    {
        path: "/article",
        exact: true,
        layout: Layout,
        breadcrumb: "Cтаття",
        component: Article,
    },
    {
        path: "/case",
        exact: true,
        layout: Layout,
        breadcrumb: "Кейси",
        component: Case,
    },
    {
        path: "/history",
        layout: Layout,
        breadcrumb: "Історія",
        component: History,
    },
    // {
    //     path: "/player",
    //     exact: true,
    //     breadcrumb: "Гравці",

    //     component: () => <Redirect to="/stats" />,
    // },
];