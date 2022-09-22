import React from 'react'
import { Redirect } from "react-router-dom";
import Layout from "../Layout"
import Main from "./../pages/Main"

// eslint-disable-next-line import/no-anonymous-default-export
export default [
    {
        path: "/",
        layout: Layout,
        component: Main,
        breadcrumb: "Головна",
        exact: true,
    },
      // {
  //   path: "/stats",
  //   exact: true,
  //   layout: Layout,
  //   breadcrumb: "Статистика",
  //   component: Tabletop,
  // },
  // {
  //   path: "/auth",
  //   exact: true,
  //   layout: Layout,
  //   breadcrumb: "Авторизация",
  //   component: AuthSite,
  // },

  // {
  //   path: "/extramods",
  //   layout: Layout,
  //   breadcrumb: "Статистика Extra Mods",
  //   component: TabletopExtra,
  // },
  // {
  //   path: "/player",
  //   exact: true,
  //   breadcrumb: "Игроки",

  //   component: () => <Redirect to="/stats" />,
  // },
];