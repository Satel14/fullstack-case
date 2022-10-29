const ITEM_CONFIG = require('../config/itemConfig');

module.exports = class OpenCase {
    _min = 1;
    _max = 100;
    _beforeStart = 40;
    _afterStart = 6;
    _totalRandomed = 30
    _raryTypes = []
    case = require('./../data/testCase').VELOCITY_CRATE;

    constructor() {
        console.log(this.openCase());
    }
    openCase() {
        this.loadRaryTypes()
        const results = this.getRandomArrayWithWinner();
        const { resultOfRoulette, winIndex } = results;

        console.log(winIndex);

        const resultWithItem = []

        for (let index = 0; index < resultOfRoulette.length; index++) {
            let item = this.getItemForIndex(resultOfRoulette[index])
            resultWithItem.push(item)
        }
        return {
            resultWithItem: resultWithItem,
            winner: { winIndex: winIndex, item: resultWithItem[winIndex - 1] },
        };
    }
    getItemForIndex(index) {
        let rariest;

        if (ITEM_CONFIG.CHANCES[ITEM_CONFIG.RARITY.MINIMAL_WEAR] <= index) {
            rariest = ITEM_CONFIG.RARITY.MINIMAL_WEAR;
        } else {
            for (let key in ITEM_CONFIG.CHANCES) {
                if (index <= ITEM_CONFIG.CHANCES[key]) {
                    rariest = key;
                }
            }
        }
        return this.getRandomItemWithRareParam(rariest)
    }

    getRandomItemWithRareParam(rariest) {
        let collectionRareItems = this.case.filter((item) => item.rare === rariest);
        return collectionRareItems[this.randomArrayIndex(collectionRareItems)];
    }

    loadRaryTypes() {
        for (let key in this.case) {
            let element = this.case[key]
            if (!this._raryTypes.includes(element.rare)) {
                this._raryTypes.push(element.rare)
            }
        }
    }
    getRandomArrayWithWinner() {
        let arrayBefore = []
        let arrayRandomized = []
        let arrayAfter = []

        for (let index = 0; index < this._beforeStart; index++) {
            arrayBefore.push(this.randomInteger(this._min, this._max))
        }
        for (let index = 0; index < this._totalRandomed; index++) {
            arrayRandomized.push(this.randomInteger(this._min, this._max))
        }
        for (let index = 0; index < this._afterStart; index++) {
            arrayAfter.push(this.randomInteger(this._min, this._max))
        }
        const radomIndex = this.randomArrayIndex(arrayRandomized)
        const winIndex = radomIndex + this._beforeStart

        const resultOfRoulette = [
            ...arrayBefore,
            ...arrayRandomized,
            ...arrayAfter,
        ]
        return { resultOfRoulette: resultOfRoulette, winIndex }
    }
    randomArrayIndex = (array) => {
        const count = array.length - 1;
        const randomInteger = this.randomInteger(0, count);
        return randomInteger;
    };
    randomInteger = (min, max) => {
        let rand = min + Math.random() * (max + 1 - min);
        return Math.floor(rand);
    };
}