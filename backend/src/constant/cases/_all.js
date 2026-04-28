const bomj = require('./bomj')
const createDefaultCase = require('./defaultCase')
const dust2Case = require('./dust2')
const infernoCase = require('./inferno')
const italyCase = require('./italy')
const lakeCase = require('./lake')
const safehouseCase = require('./safehouse')
const vertigoCase = require('./vertigo')
const trainCase = require('./train')
const stmarcCase = require('./stmarc')
const risingsunCase = require('./risingsun')
const alphaCase = require('./alpha')
const baggageCase = require('./baggage')
const bankCase = require('./bank')
const cacheCase = require('./cache')
const cobblestoneCase = require('./cobblestone')
const ancientCase = require('./ancient')
const havocCase = require('./havoc')
const controlCase = require('./control')
const nukeOpCase = require('./nuke-op')
const infernoOpCase = require('./inferno-op')
const vertigo2021Case = require('./vertigo-2021')
const mirage2021Case = require('./mirage-2021')
const dust22021Case = require('./dust2-2021')
const anubisCase = require('./anubis')
const graphicCase = require('./graphic')
const sportfieldCase = require('./sportfield')
const overpassCase = require('./overpass')

module.exports = {
    bomj,
    'havoc': havocCase,
    'cobblestone': cobblestoneCase,
    'chop-shop': createDefaultCase(2, 12),
    'train': trainCase,
    'alpha': alphaCase,
    'nuke-op': nukeOpCase,
    'st-marc': stmarcCase,
    'lake': lakeCase,
    'baggage': baggageCase,
    'bank': bankCase,
    'gods-monster': createDefaultCase(10, 12),
    'mirage-op': createDefaultCase(11, 12),
    'cache': cacheCase,
    'norse': createDefaultCase(13, 12),
    'sportfield': sportfieldCase,
    'inferno-op': infernoOpCase,
    'anubis': anubisCase,
    'dust2-op': createDefaultCase(1, 12),
    'rising-sun': risingsunCase,
    'safehouse': safehouseCase,
    'ancient': ancientCase,
    'italy': italyCase,
    'graphic': graphicCase,
    'overpass': overpassCase,
    'nuke': createDefaultCase(8, 12),
    'vertigo-2021': vertigo2021Case,
    'control': controlCase,
    'dust2-2021': dust22021Case,
    'mirage-2021': mirage2021Case,
    'dust2': dust2Case,
    'overpass-old': createDefaultCase(14, 12),
    'inferno-old': createDefaultCase(15, 12),
    'vertigo-old': createDefaultCase(0, 12),
    'velocity': createDefaultCase(1, 10),
    'victory': createDefaultCase(2, 10),
    'vindicator': createDefaultCase(3, 10),
    'zephyr': createDefaultCase(4, 10),
};