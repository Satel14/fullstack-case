import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
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

class ItemOptions extends Component {
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

    try {
      const itemPrice = await getItemPriceById(item.storage_itemId);
      const prices = typeof itemPrice.prices === 'string'
        ? JSON.parse(itemPrice.prices)
        : itemPrice.prices;
      let color = item.storage_color;
      color = color.toLowerCase();
      color = color.replace(' ', '');

      const creditModule = this.props.modules && this.props.modules['uah-credit-rate'];
      const creditToUah = creditModule ? creditModule.extraData : 1;

      let actualPrice = null;
      if (prices && prices[color]) {
        actualPrice = parseInt(prices[color] * creditToUah * 100, 10) / 100;
      }

      this.setState({
        actualPrice,
      });
    } catch (e) {
      this.setState({ actualPrice: null });
    }
  }

  setEmpty() {
    this.setState({
      item: null,
    });
    if (this.props.onClose) {
      this.props.onClose();
    }
  }

  async receiveItem() {
    const { item } = this.state;

    if (this.props.receiveInfo === '') {
      openNotification(
        'error',
        this.props.t('common.error'),
        this.props.t('itemOptions.needTradeInfo'),
      );
      return;
    }

    const result = await receiveItemByStorageId(item.storage_id);
    if (result.status === 200) {
      if (this.props.onItemRemoved) {
        this.props.onItemRemoved(item.storage_id);
      }
      this.setEmpty();
      openNotification(
        'success',
        this.props.t('itemOptions.withdrawRequested'),
        this.props.t('itemOptions.withdrawText'),
      );
      return;
    }
    openNotification('error', this.props.t('common.error'));
  }

  async sellItem() {
    const { item } = this.state;

    const result = await sellItemByStorageId(item.storage_id);
    if (result.status === 200) {
      if (window.HeaderSecond) {
        window.HeaderSecond.changeBalance(result.balance);
      }
      if (this.props.onItemRemoved) {
        this.props.onItemRemoved(item.storage_id);
      }
      this.setEmpty();
      openNotification('success', this.props.t('openCase.sold'));
      return;
    }
    openNotification('error', this.props.t('common.error'));
  }

  render() {
    const { item, actualPrice } = this.state;
    const { t } = this.props;

    if (!item) {
      return (
        <div className="item-options-not-load">
          {t('itemOptions.pick')}
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
              {t('itemOptions.sellFor')}
{' '}
{actualPrice}
{' '}
₴
            </Button>
          )}
          <Button
            type="primary"
            icon={<ShoppingCartOutlined />}
            className="color-orange craft-button-enable"
            size="large"
            onClick={() => this.receiveItem()}
          >
            {t('itemOptions.withdraw')}
          </Button>

          <Button
            type="primary"
            icon={<RollbackOutlined />}
            danger
            className="color-purple"
            size="large"
            onClick={() => this.setEmpty()}
          >
            {t('payment.cancel')}
          </Button>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  modules: state.modules,
});

export default connect(mapStateToProps, null)(withTranslation()(ItemOptions));
