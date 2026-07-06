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

    async openCase(caseId, winner) {
        this.case = allCases[caseId];

        const chances = this.case.CHANCES;
        const arrChances = [];
        for (let key in chances) {
            if (key !== 'COLORS') {
                arrChances.push(chances[key]);
            }
        }

        this._max = arrChances.reduce((a, b) => a + b, 0);
        this.allItems = await RedisManager.getAllDataHashWithKey(ITEM_HASH);

        this.loadRaryTypes();
        const results = this.getRandomArrayWithWinner();
        const { resultOfRoulette, winIndex } = results;

        // Cosmetic strip: every slot is a random item (animation only).
        const newMassiveForSend = [];
        for (let index = 0; index < resultOfRoulette.length; index++) {
            const item = this.getItemForIndex(resultOfRoulette[index]);
            const itemCache = JSON.parse(this.allItems[item.id]);
            newMassiveForSend.push({
                name: itemCache.name,
                type: itemCache.type,
                rare: itemCache.rare,
                color: this.getPaintedRandom(item),
                id: item.id,
            });
        }

        // Override the winning slot with the provably-fair result.
        const winnerCache = JSON.parse(this.allItems[winner.itemId.toString()]);
        const winnerElement = {
            name: winnerCache.name,
            type: winnerCache.type,
            rare: winnerCache.rare,
            color: winner.color,
            id: winner.itemId,
        };
        newMassiveForSend[winIndex - 1] = winnerElement;

        return {
            resultWithItem: newMassiveForSend,
            winner: { winIndex, item: winnerElement },
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
        let cumulative = 0;
        let rariest;

        for (let key in this.case.CHANCES) {
            if (key === 'COLORS') {
                continue;
            }
            cumulative += this.case.CHANCES[key];
            if (index <= cumulative) {
                rariest = key;
                break;
            }
        }

        if (!rariest) {
            rariest = this.getMostCommonRareWithItems();
        }
        return this.getRandomItemWithRareParam(rariest);
    }

    getRandomItemWithRareParam(rariest) {
        if (!this.case) {
            return;
        }

        let collectionRareItems = this.case.ITEMS.filter((item) => item.rare === rariest);
        if (collectionRareItems.length === 0) {
            const fallbackRare = this.getMostCommonRareWithItems();
            console.warn(`[caseOpen] No items for rarity "${rariest}" in case "${this.case && this.case.id}"; falling back to "${fallbackRare}"`);
            collectionRareItems = this.case.ITEMS.filter((item) => item.rare === fallbackRare);
            if (collectionRareItems.length === 0) {
                collectionRareItems = this.case.ITEMS;
            }
        }
        return collectionRareItems[this.randomArrayIndex(collectionRareItems)];
    }

    getMostCommonRareWithItems() {
        const chances = this.case.CHANCES;
        const raresWithItems = new Set(this.case.ITEMS.map((item) => item.rare));

        let best = null;
        let bestWeight = -Infinity;
        for (const key in chances) {
            if (key === 'COLORS' || !raresWithItems.has(key)) {
                continue;
            }
            if (chances[key] > bestWeight) {
                bestWeight = chances[key];
                best = key;
            }
        }
        return best;
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

        let itemColors = JSON.parse(
            JSON.parse(this.allItems[item.id.toString()]).pricesInCredits
        );

        itemColors = this.normalizeColors(itemColors);
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