import React, { Component } from "react";
import testCase from "./../data/testCase";
import Fade from "react-reveal/Fade";
import Zoom from "react-reveal/Zoom";
import { Tooltip, Button } from "antd";
import OpenCase from '../components/modules/OpenCase'
export default class Test extends Component {
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

  render() {
    return (
      <div className="casepage">
        <div className="casepage-openbutton">
        <OpenCase case={this.state.case}/>
        </div>
        <span className="casepage-title-second">
        Вміст кейсу <i>Кількість відкритих: 55</i>
        </span>
        <div className="casepage-itemlist">
          {this.state.case.items.map((item, i) => (
            <Fade delay={i * 50}>
              <Tooltip placement="bottom" title={this.renderItemProp(item)}>
                <div
                  className="casepage-itemlist_item"
                  style={{
                    backgroundImage: "url(" + item.img + ")",
                  }}
                >
                  <span>{item.name}</span>
                </div>
              </Tooltip>
            </Fade>
          ))}
        </div>
      </div>
    );
  }
}