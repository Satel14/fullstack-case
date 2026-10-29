import { siteLanguage } from '../i18n/language';
import { gradeRank } from './grade';

export const formatChance = (chance, language) => new Intl.NumberFormat(siteLanguage(language), {
    style: 'percent',
    maximumSignificantDigits: 3,
}).format(chance);

export const gradeOdds = (items, odds, gradeOf) => {
    if (!odds) {
        return [];
    }
    const droppable = [...new Set(items.map((item) => item.id))].filter((id) => odds[id] > 0);
    if (droppable.some((id) => gradeRank(gradeOf(id)) === 0)) {
        return [];
    }
    const byGrade = new Map();
    droppable.forEach((id) => {
        const grade = gradeOf(id);
        byGrade.set(grade, (byGrade.get(grade) || 0) + odds[id]);
    });
    return [...byGrade]
        .map(([grade, chance]) => ({ grade, chance }))
        .sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade));
};
