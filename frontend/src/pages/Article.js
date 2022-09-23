import React, { Component } from "react";


export default class Article extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fetching: 0,
    };
  }

  render() {
    return (
     <>Article</>
    );
  }
}