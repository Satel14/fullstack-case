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
    const byGrade = new Map();
    new Set(items.map((item) => item.id)).forEach((id) => {
        const grade = gradeOf(id);
        if (gradeRank(grade) > 0 && odds[id] !== undefined) {
            byGrade.set(grade, (byGrade.get(grade) || 0) + odds[id]);
        }
    });
    return [...byGrade]
        .map(([grade, chance]) => ({ grade, chance }))
        .sort((a, b) => gradeRank(b.grade) - gradeRank(a.grade));
};
