/* eslint-disable */
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import "antd/dist/antd.css";
import RouterLayout from './router/RouterLayout'
import "./view/style.scss";
import { Provider } from "react-redux";
import store from "./store/index"

ReactDOM.render(
  <Provider store={store}>
    <RouterLayout />
  </Provider>,
  document.getElementById("root")
);
