const months = ['Січня', 'Лютого', 'Березня', 'Квітня', 'Травня', 'Червня', 'Липня', 'Серпня', 'Вересня', 'Жовтня', 'Листопада', 'Грудня'];

function timeConverterDDMMYY(unix) {
    const dateUnix = Date.parse(unix);
    const a = new Date(dateUnix);
    const year = a.getFullYear();
    const month = months[a.getMonth()];
    const date = a.getDate();
    const time = `${date} ${month} ${year}`;
    return time;
}

function timeLeft(unix) {
    const dateUnix = Date.parse(unix);
    const lastDate = parseInt(dateUnix, 10) / 1000;

    const todayDate = Math.floor(Date.now() / 1000);
    const timeLeftDate = todayDate - lastDate;

    const minuteSeconds = 60;
    const hourSeconds = 3600;
    const daySeconds = 86400;
    const monthSeconds = 2592000;

    let text = '';

    if (monthSeconds < timeLeftDate) {
        text = 'коли-небудь';
    } else if (daySeconds < timeLeftDate) {
        const days = Math.floor(timeLeftDate / daySeconds);
        if (days === 1) {
            text = '1 день';
        } else if (days < 5) {
            text = `${days} дня`;
        } else if (days >= 5) {
            text = `${days} днів`;
        }
    } else if (hourSeconds < timeLeftDate) {
        text = `${Math.floor(timeLeftDate / hourSeconds)} годин`;
    } else if (minuteSeconds < timeLeftDate) {
        text = `${Math.floor(timeLeftDate / minuteSeconds)} хв`;
    }
    if (text === '') {
        return null;
    }

    return `${text} назад`;
}

module.exports = {
    timeConverterDDMMYY,
    timeLeft,
};
