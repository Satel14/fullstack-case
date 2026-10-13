import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import './index.css';
import 'antd/dist/antd.css';
import RouterLayout from './router/RouterLayout';
import './view/style.scss';
import './i18n';
import AntdLocale from './i18n/AntdLocale';
import store from './store/index';

ReactDOM.render(
  // @ts-ignore
  <Provider store={store}>
    <AntdLocale>
      <RouterLayout />
    </AntdLocale>
  </Provider>,
  document.getElementById('root'),
);
