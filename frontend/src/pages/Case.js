import React, { Component } from "react";
import testCase from "./../data/testCase";
import Fade from "react-reveal/Fade";
import Zoom from "react-reveal/Zoom";
import { Tooltip, Button } from "antd";

export default class Case extends Component {
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
        <div className="casepage-more">
          <Fade delay={800}>{"Кейс " + this.state.case.name}</Fade>
          <Zoom top>
            <img src={this.state.case.img} alt={this.state.case.name} />
          </Zoom>
        </div>

        <div className="casepage-openbutton">
          <Fade top delay={650}>
            <Button size={"large"} type="primary" ghost>
              Відкрити кейс
            </Button>
          </Fade>
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