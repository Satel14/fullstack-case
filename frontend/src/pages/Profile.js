import React, { Component } from "react";
import testCase from "./../data/testCase";
import Fade from "react-reveal/Fade";
import Zoom from "react-reveal/Zoom";
import { Tooltip, Button, Tabs } from "antd";
import OpenCase from "./../components/modules/OpenCase";
import { HistoryOutlined, AndroidOutlined } from "@ant-design/icons";
import Loader from "../components/mini/Loader";
const { TabPane } = Tabs;

export default class Profile extends Component {
    constructor(props) {
      super(props);
      this.state = {
        id: props.match.params.id,
        case: testCase[0],
        fetching: 0,
      };
    }
  
    renderItemProp(item) {
      return (
        "Назва: " +
        item.name +
        ", Тип: " +
        item.type +
        ", Рарність: " +
        item.rare +
        ", Колір: " +
        item.painted
      );
    }
    
    componentDidMount(){
        setTimeout(()=>{
            this.setState({
                fetching: false,
            })
        },2000)
    }
}