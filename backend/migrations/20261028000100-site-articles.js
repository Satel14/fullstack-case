const ARTICLES = [
    {
        id: 3,
        title: 'Користувацька угода',
        text: `<p>Ця угода визначає умови користування сайтом CASES.UA. Реєструючись або користуючись сайтом, ви погоджуєтеся з нею.</p>
<h3>1. Що таке CASES.UA</h3>
<p>CASES.UA — демонстраційний сайт відкриття кейсів CS2/CS:GO. Усі розрахунки ведуться у віртуальній валюті сайту (позначається ₴). Вона не є грошима: її не можна купити за справжні гроші, вивести чи обміняти на них. Поповнення балансу та виведення предметів симулюються — справжні платежі не проводяться, а предмети в Steam не передаються.</p>
<h3>2. Акаунт</h3>
<ul>
<li>Сайт призначений для осіб від 18 років.</li>
<li>Одна людина — один акаунт. Акаунти, створені, щоб отримувати бонуси повторно, можуть бути заблоковані.</li>
<li>Ви відповідаєте за збереження свого пароля. Адміністрація ніколи його не запитує.</li>
</ul>
<h3>3. Відкриття кейсів</h3>
<p>Результат кожного відкриття визначає алгоритм provably fair: перед відкриттям ви бачите хеш серверного сіда, а після його зміни можете перевірити будь-яке відкриття на сторінці <a href="/provably-fair">«Чесна гра»</a>.</p>
<h3>4. Відповідальність</h3>
<p>Сайт надається «як є». Адміністрація може змінювати кейси, ціни, бонуси й ці умови, а також обнуляти віртуальні баланси, якщо цього потребує робота сайту.</p>
<h3>5. Порушення</h3>
<p>За порушення цієї угоди або <a href="/article/6">правил сервісу</a> адміністрація може заборонити писати в чат або заблокувати акаунт.</p>
<h3>6. Дані</h3>
<p>Ми зберігаємо логін, адресу пошти, хеш пароля та історію дій на сайті. Пошта потрібна лише для підтвердження реєстрації та відновлення пароля.</p>`,
        titleEn: 'User Agreement',
        textEn: `<p>These terms govern the use of CASES.UA. By registering or using the site, you accept them.</p>
<h3>1. What CASES.UA is</h3>
<p>CASES.UA is a demo CS2/CS:GO case-opening site. Everything on the site is paid for in the site's virtual currency (shown as ₴). It is not money: it cannot be bought with real money, withdrawn or exchanged for money. Top-ups and item withdrawals are simulated — no real payments are made and no items are sent on Steam.</p>
<h3>2. Your account</h3>
<ul>
<li>The site is for people aged 18 and over.</li>
<li>One person, one account. Accounts created to collect bonuses again may be banned.</li>
<li>You are responsible for keeping your password safe. The site staff never ask for it.</li>
</ul>
<h3>3. Opening cases</h3>
<p>Every opening is decided by a provably fair algorithm: before opening you see the hash of the server seed, and after changing the seed you can verify any opening on the <a href="/provably-fair">Provably Fair</a> page.</p>
<h3>4. Liability</h3>
<p>The site is provided "as is". The staff may change cases, prices, bonuses and these terms, and may reset virtual balances if running the site requires it.</p>
<h3>5. Violations</h3>
<p>For breaking these terms or the <a href="/article/6">service rules</a>, the staff may stop you from writing in the chat or ban your account.</p>
<h3>6. Your data</h3>
<p>We store your login, email address, password hash and your history on the site. The email address is used only to confirm registration and to reset your password.</p>`,
    },
    {
        id: 6,
        title: 'Правила сервісу',
        text: `<p>Правила діють для всіх гравців CASES.UA. За порушення адміністрація може заборонити писати в чат або заблокувати акаунт.</p>
<h3>Акаунт і бонуси</h3>
<ul>
<li>Один акаунт на людину. Мультиакаунти для повторних бонусів і переказу балансу заборонені.</li>
<li>Заборонено використовувати помилки сайту, щоб отримати валюту чи предмети. Про знайдену помилку повідомте адміністрації.</li>
<li>Заборонено автоматизувати дії на сайті (боти, скрипти).</li>
</ul>
<h3>Чат</h3>
<ul>
<li>Заборонено використовувати в нікнеймі назву або посилання, що ведуть на сторонній сайт.</li>
<li>Заборонено рекламувати канали Youtube / Twitch / Discord.</li>
<li>Заборонено ображати інших учасників чату / сайту.</li>
<li>Заборонено згадування платіжних реквізитів з метою жебрацтва.</li>
<li>Заборонено розповсюджувати URL посилання та промо-коди (крім Адміністрації та Модераторів).</li>
<li>Заборонено спамити повідомлення в чат по одному символу.</li>
<li>Будь-який учасник сайту/чату повинен з повагою ставитися до всіх без винятку учасників.</li>
</ul>`,
        titleEn: 'Service Rules',
        textEn: `<p>These rules apply to every CASES.UA player. For breaking them, the staff may stop you from writing in the chat or ban your account.</p>
<h3>Account and bonuses</h3>
<ul>
<li>One account per person. Multiple accounts used to collect bonuses again or to move balance are forbidden.</li>
<li>Using site bugs to get currency or items is forbidden. If you find a bug, tell the staff.</li>
<li>Automating actions on the site (bots, scripts) is forbidden.</li>
</ul>
<h3>Chat</h3>
<ul>
<li>Using a name or links leading to a third-party site in your nickname is forbidden.</li>
<li>Advertising Youtube / Twitch / Discord channels is forbidden.</li>
<li>Insulting other chat / site participants is forbidden.</li>
<li>Mentioning payment details for the purpose of begging is forbidden.</li>
<li>Distributing URL links and promo codes is forbidden (except Administration and Moderators).</li>
<li>Spamming the chat with one-character messages is forbidden.</li>
<li>Every site/chat participant must treat all participants with respect, without exception.</li>
</ul>`,
    },
    {
        id: 8,
        title: 'Як отримати більше коштів',
        text: `<p>Баланс на CASES.UA — віртуальна валюта сайту. Ось усі способи його поповнити:</p>
<ul>
<li><strong>Бонуси</strong> на сторінці <a href="/bonus">«Бонуси»</a>: щоденний 50 ₴ (раз на добу за київським часом), вітальний 100 ₴, 50 ₴ за заповнену інформацію для виводу, 100 ₴ за перший відкритий кейс і 200 ₴ за перший виведений предмет.</li>
<li><strong>Промокоди</strong>: введіть код на сторінці <a href="/promocode">«Промокоди»</a> або в налаштуваннях. Коди роздає адміністрація — стежте за чатом.</li>
<li><strong>Продаж предметів</strong>: продайте предмет одразу після відкриття або пізніше в <a href="/inventory">інвентарі</a> — його ціна повернеться на баланс.</li>
<li><strong>Поповнення</strong> на сторінці <a href="/deposit">«Поповнити»</a>. Це симуляція: справжні гроші не списуються.</li>
</ul>`,
        titleEn: 'How to get more credits',
        textEn: `<p>Your CASES.UA balance is the site's virtual currency. These are all the ways to add to it:</p>
<ul>
<li><strong>Bonuses</strong> on the <a href="/bonus">Bonuses</a> page: a daily 50 ₴ (once a day, Kyiv time), a 100 ₴ welcome bonus, 50 ₴ for filling in your item withdrawal information, 100 ₴ for your first opened case and 200 ₴ for your first withdrawn item.</li>
<li><strong>Promocodes</strong>: enter a code on the <a href="/promocode">Promocodes</a> page or in the settings. The staff hand out codes — keep an eye on the chat.</li>
<li><strong>Selling items</strong>: sell an item right after opening or later in your <a href="/inventory">inventory</a>, and its price goes back to your balance.</li>
<li><strong>Top-ups</strong> on the <a href="/deposit">Top up</a> page. This is a simulation: no real money is charged.</li>
</ul>`,
    },
    {
        id: 9,
        title: 'Контакти',
        text: `<p>Найшвидше зв'язатися з адміністрацією CASES.UA — написати в чаті сайту: увійдіть і натисніть «Чат» угорі сторінки. Опишіть проблему, вкажіть свій логін, а якщо питання про відкриття кейсу — то й приблизний час.</p>
<p>Відповіді на часті питання зібрані на сторінці <a href="/faq">FAQ</a>.</p>`,
        titleEn: 'Contacts',
        textEn: `<p>The quickest way to reach the CASES.UA staff is the site chat: sign in and press "Chat" at the top of the page. Describe the problem and give your login, and for a question about a case opening, the approximate time.</p>
<p>Answers to common questions are on the <a href="/faq">FAQ</a> page.</p>`,
    },
];

module.exports = {
    async up({ context: queryInterface }) {
        for (const article of ARTICLES) {
            // eslint-disable-next-line no-await-in-loop
            const [existing] = await queryInterface.sequelize.query(
                'SELECT id FROM articles WHERE id = ?',
                { replacements: [article.id] },
            );
            if (existing.length === 0) {
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.sequelize.query(
                    'INSERT INTO articles (id, title, text, titleEn, textEn, views, created_at, updated_at) '
                    + 'VALUES (?, ?, ?, ?, ?, 0, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
                    { replacements: [article.id, article.title, article.text, article.titleEn, article.textEn] },
                );
            }
        }
    },

    async down({ context: queryInterface }) {
        for (const article of ARTICLES) {
            // eslint-disable-next-line no-await-in-loop
            await queryInterface.sequelize.query(
                'DELETE FROM articles WHERE id = ? AND title = ?',
                { replacements: [article.id, article.title] },
            );
        }
    },
};
