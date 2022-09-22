import React from "react";

export default class App extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = {
      fetching: 0,
    };
  }

  render() {
    return (
      <section className="content container">{this.props.children}</section>
    );
  }
}