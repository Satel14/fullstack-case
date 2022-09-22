import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";
import routes from "./routes";
import Layout from '../Layout.tsx'
export default class RouterLayout extends Component {
    constructor(props) {
      super(props);
      this.state = {
        fetching: 0,
      };
    }
  
    render() {
      return (
        <BrowserRouter>
          <Layout>
            <Switch>
              {routes.map((route, index) => {
                return (
                  <Route
                    key={index}
                    path={route.path}
                    exact={route.exact}
                    breadcrumb={route.breadcrumb}
                    component={(props) => {
                      return (
                        <>
                          <route.component {...props} />
                        </>
                      );
                    }}
                  />
                );
              })}
            </Switch>
          </Layout>
        </BrowserRouter>
      );
    }
  }