import i18n from '../i18n';

export function timeConverterDDMMYY(unix) {
    const a = new Date(Date.parse(unix));
    const months = i18n.t('time.months', { returnObjects: true });
    const month = Array.isArray(months) ? months[a.getMonth()] : '';
    return `${a.getDate()} ${month} ${a.getFullYear()}`;
}

export function timeLeft(unix) {
    const lastDate = parseInt(Date.parse(unix), 10) / 1000;
    const todayDate = Math.floor(Date.now() / 1000);
    const diff = todayDate - lastDate;

    const minuteSeconds = 60;
    const hourSeconds = 3600;
    const daySeconds = 86400;
    const monthSeconds = 2592000;

    if (monthSeconds < diff) {
        return i18n.t('time.someday');
    }

    let text = '';
    if (daySeconds < diff) {
        text = i18n.t('time.days', { count: Math.floor(diff / daySeconds) });
    } else if (hourSeconds < diff) {
        text = i18n.t('time.hours', { count: Math.floor(diff / hourSeconds) });
    } else if (minuteSeconds < diff) {
        text = i18n.t('time.minutes', { count: Math.floor(diff / minuteSeconds) });
    } else {
        return null;
    }

    return i18n.t('time.ago', { value: text });
}
