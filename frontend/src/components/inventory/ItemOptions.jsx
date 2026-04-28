import React, { Component } from 'react';
import { Button } from 'antd';
import {
  DollarOutlined,
  RollbackOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import ItemColor from '../mini/ItemColor';
import {
  sellItemByStorageId,
  receiveItemByStorageId,
} from '../../api/all/storage';
import openNotification from '../mini/openNotification';

import { getItemPriceById } from '../../api/all/item';

export default class ItemOptions extends Component {
  constructor(props) {
    super(props);
    this.state = {
      item: this.props.item,
      actualPrice: null,
    };
  }

  componentDidMount() {
    const { item } = this.props;
    if (item) {
      this.getPrice();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.item !== prevProps.item) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({
        item: this.props.item,
      });

      if (!this.props.item) {
        return;
      }

      if (prevProps.item) {
        if (this.props.item.storage_itemId === prevProps.item.storage_itemId) {
          return;
        }
      }

      this.getPrice();
    }
  }

  async getPrice() {
    const { item } = this.props;

    const itemPrice = await getItemPriceById(item.storage_itemId);
    const prices = JSON.parse(itemPrice.prices);
    let color = item.storage_color;
    color = color.toLowerCase();
    color = color.replace(' ', '');

    const creditToRub = this.props.modules['rub-credit-rate'].extraData;

    let actualPrice = null;
    if (prices) {
      if (prices[color]) {
        actualPrice = parseInt(prices[color] * creditToRub * 100, 10) / 100;
      }
    }

    this.setState({
      actualPrice,
    });
  }

  setEmpty() {
    this.setState({
      item: null,
    });
    window.Inventory.setEmpty();
  }

  async receiveItem() {
    const { item } = this.state;

    if (this.props.receiveInfo === '') {
      openNotification(
        'error',
        'Сталася помилка',
        'Вкажіть у налаштуваннях профілю дані вашого Steam або Epic.',
      );
      return;
    }

    const result = await receiveItemByStorageId(item.storage_id);
    if (result.status === 200) {
      window.Inventory.deleteItem(item.storage_id);
      this.setEmpty();
      openNotification(
        'success',
        'Залишено заявку на вивід',
        'Трейдер додасть вас протягом 24 годин та віддасть предмет.',
      );
      return;
    }
    openNotification('error', 'Сталася помилка');
  }

  async sellItem() {
    const { item } = this.state;

    const result = await sellItemByStorageId(item.storage_id);
    if (result.status === 200) {
      window.HeaderSecond.changeBalance(result.balance);
      window.Inventory.deleteItem(item.storage_id);
      this.setEmpty();
      openNotification('success', 'Предмет продано');
      return;
    }
    openNotification('error', 'Сталася помилка');
  }

  render() {
    const { item, actualPrice } = this.state;

    if (!item) {
      return (
        <div className="item-options-not-load">
          Виберіть предмет для взаємодії
        </div>
      );
    }

    return (
      <div className={item ? 'item-options opened' : 'item-options'}>
        <div className="item-options_block">
          <div className="item-options_block__info">
            <div
              className={`casepage-itemlist_item r-${item.item_rare}`}
              style={{
                backgroundImage: `url(/img/items/${item.storage_itemId}.webp)`,
              }}
            >
              <ItemColor color={item.storage_color} />
            </div>
            <span>
              {item.item_name}
              <div>
                {item.item_rare}
-
{item.item_type}
              </div>
            </span>
          </div>
          {actualPrice && (
            <Button
              type="primary"
              icon={<DollarOutlined />}
              size="large"
              className="color-green"
              onClick={() => this.sellItem()}
            >
              Продати за
{' '}
{actualPrice}
{' '}
₽
            </Button>
          )}
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            className="color-orange craft-button-enable"
            size="large"
            onClick={() => this.receiveItem()}
          >
            Вивести предмет
          </Button>

          <Button
            type="primary"
            icon={<RollbackOutlined />}
            danger
            className="color-purple"
            size="large"
            onClick={() => this.setEmpty()}
          >
            Скасувати
          </Button>
        </div>
      </div>
    );
  }
}
