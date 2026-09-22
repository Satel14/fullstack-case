module.exports = {
    AUTH: {
        NOT_CORRECT: 'Дані не вірні',
        NOT_AUTHORIZED: 'Ви не авторизовані',
        SUCCESS_LOGOUT: 'Вийшли з аккаунта',
        EMPTY_DATA: 'Дані не отримано',
        USER_IS_EXIST: 'Такий логін (або пошта) вже існує',
        RESET_LINK_SENT: 'Якщо акаунт із цією поштою існує, ми надіслали на неї посилання для зміни пароля',
        RESET_LINK_INVALID: 'Посилання недійсне або застаріло. Запросіть нове',
        PASSWORD_INVALID: 'Пароль має містити від 6 до 72 символів',
        PASSWORD_CHANGED: 'Пароль змінено. Увійдіть з новим паролем',
        PASSWORD_RESET_UNAVAILABLE: 'Відновлення пароля тимчасово недоступне'
    },
    VALIDATOR: {
        ERROR: "Помилка валідації"
    },
    MODULE: {
      NOT_EXIST: 'Такого модуля не існує'
    },
    CASE: {
        ERROR: 'Помилка кейсів',
        ERROR_CATEGORY: 'Помилка категорії',
        NOT_EXIST: 'Такий кейс не існує',
        NOT_PUBLISHED: 'Кейс недоступний для відкриття',
        NOT_HAVE_MONEY: 'Недостатньо грошей',
        LIMIT_EXCEEDED: 'Перевищено ліміт відкриттів кейсу'
    },
    ITEM: {
        NOT_EXIST: 'Такого предмету не існує',
        ERROR: 'Помилка предмету'
    },
    PROMOCODE: {
        NOT_EXIST: 'Такого промокоду не існує',
        LIMIT_MAX: 'Ліміт використань промокоду вичерпано',
        USED_BY_YOURSELF: 'Ви вже використали цей промокод',
        ADDED: 'Промокод активовано, нараховано'
    },
    USER: {
        NOT_EXIST: 'Такого користувача не існує',
        MONEY_NOT_ENOUGH: 'Недостатньо грошей',
        CANT_UPDATE_FIELD: 'Це поле не можна змінювати'
    },
    BONUS: {
        NOT_EXIST: 'Такого бонуса не існує',
        ALREADY_USED: 'Бонус вже отримано'
    },
    ARTICLE: {
        NOT_EXIST: 'Такої статті не існує'
    },
    PROVABLY_FAIR: {
        SEED_UPDATED: 'Client seed оновлено',
        ROTATED: 'Server seed оновлено',
        CLIENT_SEED_INVALID: 'Некоректний client seed',
        VERIFY_ERROR: 'Не вдалося перевірити результат',
    },
    ADMIN: {
        ERROR: 'Помилка адміністрування',
        NOT_ADMIN: 'Ви не авторизовані',
        BANNED: 'Ваш акаунт заблоковано',
        REASON_REQUIRED: 'Вкажіть причину',
        SELF_FORBIDDEN: 'Не можна змінювати власний акаунт',
        NEGATIVE_BALANCE: 'Баланс не може бути відʼємним',
        ROLE_INVALID: 'Невідома роль',
        ROLE_ADMIN_FORBIDDEN: 'Роль адміністратора призначається лише через CLI',
        USER_NOT_EXIST: 'Такого користувача не існує',
    },
}
