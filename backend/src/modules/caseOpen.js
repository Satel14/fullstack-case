const ITEM_CONFIG = require('../constant/itemConfigs');
const allCases = require('../constant/cases/_all');
const RedisManager = require('../redis/manager');
const ITEM_HASH = "item_hash";
module.exports = class OpenCase {
    _min = 1;
    _max = 100;
    _beforeStart = 40;
    _afterStart = 6;
    _totalRandomed = 30
    _raryTypes = []
    case;

    allItems;

    async openCase(caseId) {
        this.case = allCases[caseId];

        const chances = this.case.CHANCES;
        const arrChances = [];
        for (let key in chances) {
            if (key !== 'COLORS') {
                let el = chances[key];
                arrChances.push(el);
            }
        }

        this._max = arrChances.reduce((a, b) => a + b, 0);
        this.allItems = await RedisManager.getAllDataWithKey(ITEM_HASH);

        this.loadRaryTypes();
        const results = this.getRandomArrayWithWinner();
        const { resultOfRoulette, winIndex } = results;
        const resultWithItem = [];

        for (let index = 0; index < resultOfRoulette.length; index++) {
            let item = this.getItemForIndex(resultOfRoulette[index]);

            resultWithItem.push({
                ...item,
                color: this.getPaintedRandom(item),
            });
        }

        let newMassiveForSend = [];

        resultWithItem.forEach((currentItem) => {
            let {id, color} = currentItem;
            let itemCache = JSON.parse(this.allItems[id]);

            let element = {
                name: itemCache.name,
                type: itemCache.type,
                rare: itemCache.rare,
                color,
                id
            };
            newMassiveForSend.push(element);
        })

        return {
            resultWithItem: newMassiveForSend,
            winner: { winIndex: winIndex, item: newMassiveForSend[winIndex - 1] },
            caseId,
        };
    }

    inRange(x, min, max) {
        return (x - min) * (x - max) <= 0;
    }


    normalizeColors(colors) {
        let newColors = {};
        const chanceColorList = this.case.CHANCES.COLORS.LIST;

        for (let color in colors) {
            let colorPrice = colors[color];

            if (colorPrice && color !== "default") {
                newColors[color] = chanceColorList[color];
            }
        }

        return newColors;
    }

    getRandomColor(colors) {
        const list = this.normalizeColors(colors);

        const arrayKeyslist = Object.values(list);
        if (arrayKeyslist.length === 0) {
            return ITEM_CONFIG.COLORS.DEFAULT;
        }

        const reducer = (accumulator, currentValue) => accumulator + currentValue;

        const max = arrayKeyslist.reduce(reducer);
        const getRandomColorInteger = this.randomInteger(0, max);

        let sum = 0;
        let color;

        for (let k in list) {
            if (this.inRange(getRandomColorInteger, sum, sum + list[k])) {
                color = k;
                break;
            }
            sum = sum + list[k];
        }
        return color;
    }

    getItemForIndex(index) {
        let rariest;

        let arrOfChance = Object.keys(this.case.CHANCES);
        const lowestChance = this.case.CHANCES[arrOfChance[0]];

        if (lowestChance <= index) {
            rariest = arrOfChance[0];
        } else {
            for (let key in this.case.CHANCES) {
                if (index <= this.case.CHANCES[key]) {
                    rariest = key;
                }
            }
        }
        return this.getRandomItemWithRareParam(rariest);
    }

    getRandomItemWithRareParam(rariest) {
        if (!this.case) {
            return;
        }

        let collectionRareItems = this.case.filter((item) => item.rare === rariest);
        return collectionRareItems[this.randomArrayIndex(collectionRareItems)];
    }

    loadRaryTypes() {
        if (!this.case) {
            return;
        }

        for (let key in this.case.ITEMS) {
            let element = this.case.ITEMS[key]
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

    getPaintedRandom(item) {
        if (item.colors.length === 1) {
            return item.colors[0];
        }

        // item config case
        let itemColors = JSON.parse(
            JSON.parse(this.allItems[item.id.toString()]).pricesInCredits
        );

        itemColors = this.normalizeColors(JSON.parse(itemColors));
        const countColors = Object.keys(itemColors).length;

        if (countColors > 1) {
            const max =
                this.case.CHANCES.COLORS.DEFAULT + this.case.CHANCES.COLORS.PAINTED;
            const getRandomIsPainted = this.randomInteger(0, max);
            if (
                !this.inRange(getRandomIsPainted, 0, this.case.CHANCES.COLORS.DEFAULT)
            ) {
                return this.getRandomColor(itemColors);
            }
        }
        return ITEM_CONFIG.COLORS.DEFAULT;
    }

    randomInteger = (min, max) => {
        let rand = min + Math.random() * (max + 1 - min);
        return Math.floor(rand);
    };
}