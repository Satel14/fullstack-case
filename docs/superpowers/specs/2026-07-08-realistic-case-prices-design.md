# Реалістичні ціни + перезбірка кейсів — дизайн

**Дата:** 2026-07-08
**Статус:** затверджено (дизайн), очікує ревʼю спеки

## Контекст і мета

CS:GO-style платформа відкриття кейсів. Зараз:
- ~1769 предметів (реальні назви скінів) сідяться з `frontend/public/img/items/**`, ціни в `insiderPrices` генеруються **випадково** за «грейдом», який визначається лише позицією файлу в теці. Ціни не мають звʼязку з реальним ринком.
- 38 кейсів у `backend/src/constant/cases/*.js`. Кожен = набір `id` предметів, згрупованих по бакетах `rare` (знос), + `CHANCES` (ваги бакетів). Ціна кейса — плоска **100** для всіх (дефолт із `seedCases.js`, бо конфіги не експортують `price`).
- Сторінка кейса показує предмети, відсортовані за зносом, без цін.

**Мета:** зробити ціни предметів приблизно реальними (з market.csgo.com), перезібрати вміст і шанси кейсів так, щоб виглядало як на реальних сайтах (дешеві часто, дорогі рідко, ніж-джекпот), виставити ціну кейса з накруткою казино ~15%, і на сторінці кейса показувати ціну + шанс кожного предмета з переходом на market.csgo.com по кліку.

## Зафіксовані рішення

1. **Обсяг:** ціни + вміст/шанси кейсів. Двигун розіграшу (`caseOpen.js`, розіграш по бакетах `rare`) **не чіпаємо**.
2. **Джерело цін:** максимум реальних — bulk-дамп `market.csgo.com/api/v2/prices/USD.json`; модель лише для прогалин.
3. **Накрутка:** ~15% (EV ≈ 85% ціни кейса).
4. **UI кейса:** ціна (₴) + шанс % біля кожного предмета; клік → market.csgo.com.
5. **Курс USD→UAH:** свіжий з API НБУ при кожному пере-сіді, фолбек ₴41.
6. **Вміст кейсів:** авто-генерація під архетипи.
7. **Кольори на сторінці кейса:** за грейдом/цінністю (синій→фіолетовий→рожевий→червоний→золото), не за зносом.
8. **Ніж-джекпот** у кожному кейсі.

## Ключовий факт про двигун (валідовано)

Поле `rare` в `case.ITEMS[]` використовується **лише** як бакет шансу (`getItemForIndex` → фільтр `ITEMS` по `rare`). Показаний користувачу знос береться з **самого предмета** (`itemCache[id].item_rare` / `winnerCache.rare`), НЕ з `case.ITEMS[].rare`. Тому можна вільно розкладати предмети по 5 бакетах за **цінністю**, і це не змінює відображений знос. `getCaseById` повертає весь конфіг (`CHANCES` + `ITEMS`) на фронт → шанси рахуються клієнтом без змін бекенду.

## Архітектура даних (потік)

```
market.csgo.com USD.json ─┐
NBU USD→UAH rate ─────────┼─► buildPriceMap ─► insiderPrices (DB, per name)
frontend/public/img/items ┘                 └► priceMap.json (для генератора)

priceMap.json + archetypes ─► generateCases ─► cases/*.js (ITEMS+CHANCES) + casePrices.json
casePrices.json ─► seedCases ─► cases (DB, price/title)

insiderPrices + items (DB) ─► RedisManager.initialRedisState ─► item_hash (Redis, runtime)
```

## Частина A — Отримання реальних цін

**Скрипт `backend/scripts/fetchMarketPrices.js`:**
- GET `https://market.csgo.com/api/v2/prices/USD.json` → зберегти сирий JSON у `backend/scripts/data/market-usd.json` (кеш на диску, щоб не бити API повторно).
- GET курс НБУ `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json` → `rate` (напр. 41.5). Фолбек `41` якщо недоступно. Зберегти у `market-usd.json` разом із timestamp.

**Спільний модуль `backend/scripts/lib/enumerateItems.js`:** винести логіку сканування тек із `seedItemsFromImages.js` (обхід `frontend/public/img/items/**`, той самий порядок → ті самі `itemId`, `rare` за `index%5`, `type` за категорією). Повертає `[{ itemId, name, rare, type, colors, imagePath, category, weapon }]`. Використовують і `seedItemsFromImages.js`, і `buildPriceMap.js` — щоб `itemId`/знос збігались і не було дрейфу. Дозволяє будувати `priceMap.json` **без БД**.

**Скрипт `backend/scripts/buildPriceMap.js`:**
- Джерело предметів: `enumerateItems()` (теки, без БД). Знос кожного предмета = детермінований `index%5`, як при сіді.
- Індекс маркету: `Map<market_hash_name, priceUSD>` з `market-usd.json`.
- Для кожного предмета побудувати `market_hash_name`:
  - `base = (isKnife ? '★ ' : '') + item_name` (isKnife: `item_type === 'knife'`).
  - `wearMkt` за мапою: `Factory New→Factory New`, `Minimal wear→Minimal Wear`, `Field Tested→Field-Tested`, `Well Worn→Well-Worn`, `Battle Scarred→Battle-Scarred`.
  - `hash = `${base} (${wearMkt})``.
  - `default` = `priceUSD(hash)`; якщо нема — спробувати інші зноси (nearest) для того ж `base`; якщо нема — **fallback-модель**.
  - `painted` = `priceUSD('StatTrak™ ' + hash)` якщо є, інакше `round(default * 1.4)`.
  - Ціни × `rate` → UAH, округлити до цілого (≥1).
- **Fallback-модель** (детермінована, для незматчених): базова ціна за типом зброї × множник зносу, у реальних діапазонах:
  - knife: 1500–8000 ₴, sniper (AWP тощо): 200–3000, rifle: 50–1500, pistol/smg/shotgun/heavy: 5–400.
  - множник зносу: FN 1.0, MW 0.85, FT 0.65, WW 0.5, BS 0.4.
  - детермінізм: hash від `item_name` → стабільне значення в діапазоні (без `Math.random`, щоб пере-запуски збігались).
- Вихід 1 (завжди, без БД): `backend/scripts/data/priceMap.json` = `{ [itemId]: { name, type, rare, default, painted } }` — для генератора кейсів.
- Вихід 2 (якщо БД доступна): `insiderPrices.upsert({ name, pricesInCredits: JSON.stringify({ default, painted }) })` для кожного предмета. Якщо БД нема — крок пропускається з попередженням, `priceMap.json` усе одно створюється.
- Залогувати % незматчених предметів (пішли у fallback-модель).
- **Оновлення `seedItemsFromImages.js`:** прибрати `getPriceByGrade` (випадкові ціни). Скрипт лишається для створення рядків `items`; ціни тепер ставить `buildPriceMap.js`. (Sequence при чистому сіді: seedItems → buildPriceMap.)

## Частина B — Генерація кейсів

**Архетипи** (стеля цінності джекпота / діапазон ціни кейса):

| Архетип | Стеля джекпота | Орієнтовна ціна кейса |
|---|---|---|
| Budget | ~₴2 000 | ₴15–60 |
| Standard | ~₴15 000 | ₴150–400 |
| Premium | ~₴60 000 | ₴500–1 500 |
| Elite | ₴200 000+ | ₴2 000–6 000 |

Призначення 38 кейсів → архетип: таблиця в генераторі (`bomj`→Budget; `*-old`, базові → Budget/Standard; мапи-колекції → Standard/Premium; кілька топових → Elite; дефолт Standard).

**Бакети (5, ключі = назви зносу, бо двигун так очікує), шаблон ваг:**

| Бакет (ключ) | Вага | К-сть предметів | ~% на предмет |
|---|---|---|---|
| Common | 55 | 5–7 | ~8–11% |
| Uncommon | 28 | 3–4 | ~7–9% |
| Rare | 12 | 2–3 | ~4–6% |
| Covert | 4 | 1–2 | ~2–4% |
| Jackpot (ніж) | 1 | 1 | ~1% |

(Ваги/розміри тюняться; сума ваг = 100. `COLORS`: DEFAULT 90 / PAINTED 10 — як зараз.)

**Скрипт `backend/scripts/generateCases.js`:**
- Вхід: `priceMap.json`. Пул розбити на band-и за ціною + окремо ножі (`type==='knife'`).
- Для кожного кейса (seeded PRNG від `caseId`, детерміновано):
  1. За архетипом обрати цільові price-band-и для кожного бакета.
  2. Насемплити предмети без повторів у межах кейса (перетин між кейсами дозволений, як на реальних сайтах).
  3. Jackpot-бакет = 1 ніж із band-у архетипа.
  4. Порахувати `EV = Σ_item P(item) × (0.9·default + 0.1·painted)`, де `P(item)=weight(bucket)/Σweights/countInBucket`.
  5. `price = round(EV / 0.85)`.
- Вихід:
  - Перезаписати `backend/src/constant/cases/<id>.js` (експорт `CHANCES` + `ITEMS`) для всіх кейсів. `createDefaultCase`-кейси (`chop-shop`, `gods-monster`, `mirage-op`, `norse`, `dust2-op`, `nuke`, `overpass-old`, `inferno-old`, `vertigo-old`, `velocity`, `victory`, `vindicator`, `zephyr`) матеріалізувати у статичні файли + оновити `_all.js`, щоб імпортував їх замість `createDefaultCase(...)` (тоді `seedCases` не пропускає їх як функції). `defaultCase.js` можна лишити невикористаним.
  - `backend/scripts/data/casePrices.json` = `{ [caseId]: { price, title } }`.
- **Оновлення `seedCases.js`:** читати `price` (і `title` за наявності) з `casePrices.json`; лишити `imageMap`/категорії. Прибрати `continue` для функцій (тепер усі статичні).

## Частина C — Фронтенд + мінімальний бекенд

**Бекенд — `getItemById` (`controllers/item.js`):** додати у відповідь ціни, щоб кеш предметів на сторінці кейса мав ціну:
```js
const prices = await InsiderService.getItemPrice(itemInfo.item_name);
const pricesInCredits = prices?.pricesInCredits ? JSON.parse(prices.pricesInCredits) : null;
return res.status(200).json({ status: 200, data: { ...itemInfo.dataValues, pricesInCredits } });
```
(Ендпоінт `getItemPriceById` лишається; окремих N-запитів не додаємо.)

**Фронтенд — `pages/Case.jsx` + допоміжні:**
- `helpers/rarity.js`: додати `valueGrade(priceUAH)` → грейд + колір із `GRADE_COLORS` (пороги: <50 Consumer, <150 Industrial, <600 Mil-Spec, <2500 Restricted, <10000 Classified, <50000 Covert, ≥50000 Gold/Knife).
- `helpers/Case.js` або новий хелпер: `itemDropChance(caseCollection, item)` = `CHANCES[item.rare] / Σ(CHANCES без COLORS) / (к-сть ITEMS з тим самим rare)`.
- `helpers/market.js`: `marketUrl(name, isKnife)` = `https://market.csgo.com/en/?search=` + `encodeURIComponent((isKnife?'★ ':'')+name)`.
- Сортування списку: за ціною (₴) спадно (дорогі зверху); фолбек за зносом поки кеш не заповнився.
- Рендер кожного предмета:
  - Колір рамки/`--rarity` = `valueGrade(price).color` (замість `wearColor`).
  - Показати назву, **ціну ₴** (`computeItemPriceUAH`), **шанс %** (`itemDropChance`).
  - Обгорнути в `<a href={marketUrl(...)} target="_blank" rel="noopener noreferrer">`.
- SCSS: додати стилі для ціни/шансу/ховера; клас `rc-*` за зносом лишити або замінити на грейд-клас (косметика).
- i18n: додати ключі (`case.price`, `case.chance`) в `uk` + `en`.

## Частина D — Застосування і пере-сід

Передумова: MySQL (`localhost:3306`, db `case`) + Redis доступні. Кроки:
1. `node backend/scripts/seedItemsFromImages.js` (рядки items; вже без випадкових цін) — за потреби.
2. `node backend/scripts/fetchMarketPrices.js` (дамп цін + курс).
3. `node backend/scripts/buildPriceMap.js` (insiderPrices + priceMap.json).
4. `node backend/scripts/generateCases.js` (перезапис cases/*.js + casePrices.json).
5. `node backend/scripts/seedCases.js` (ціни/тайтли кейсів у БД).
6. Перезапуск backend (або виклик `RedisManager.initialRedisState()`) → Redis `item_hash` перечитає ціни.

Якщо БД недоступна в цьому середовищі — скрипти + інструкція постачаються, а зміни коду (case configs, frontend) застосовуються й перевіряються окремо.

## Частина E — Верифікація

- Спот-чек: 5–10 предметів — звірити ₴-ціну з market.csgo.com (в межах курсу).
- Відкрити 1–2 кейси через API/UI: винесений предмет має адекватну ціну; сума продажу в інвентарі коректна.
- Сторінка кейса: предмети відсортовані за ціною, показують ₴ + %, клік веде на market.csgo.com, кольори за грейдом.
- Сума `P(item)` по кейсу = 100%; `EV/price ≈ 0.85` (лог у генераторі).
- `frontend` build/lint без нових помилок.

## Ризики / відкриті питання

- **Матчинг назв:** одруковані/локальні назви скінів (`Boroque Sand`, `Desert-Strike`, `dev_texture`) не зматчаться → підуть у fallback-модель. Прийнятно (частка мала); залогувати % незматчених.
- **Знос, якого не існує** (напр. Doppler BS): nearest-wear фолбек, потім модель.
- **Масштаб цін** зросте (ножі десятки тис. ₴): існуючі тестові баланси/ліміти можуть виглядати малими — очікувано, realism-first.
- **`painted` = StatTrak** — синтетична апроксимація, не 1:1 з реальністю, але «плюс-мінус».
- Курс НБУ фіксується на момент сіду (не live per-request) — оновлюється пере-запуском.

## Поза обсягом

- Зміни двигуна розіграшу / грейд-based rarity в самому розіграші.
- Live-конвертація валют у рантаймі.
- Тематична ручна підбірка предметів під кожну мапу.
- StatTrak/сувенірні механіки понад наявний default/painted.
