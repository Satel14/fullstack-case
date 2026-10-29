export const GRADES = ['consumer', 'industrial', 'milspec', 'restricted', 'classified', 'covert', 'contraband', 'special'];

const GRADE_COLORS = {
    consumer: '#b0c3d9',
    industrial: '#5e98d9',
    milspec: '#4b69ff',
    restricted: '#8847ff',
    classified: '#d32ce6',
    covert: '#eb4b4b',
    contraband: '#e4ae39',
    special: '#f7c948',
};

const UNKNOWN_COLOR = '#6d81b0';

export const gradeRank = (grade) => GRADES.indexOf(grade) + 1;

export const gradeColor = (grade) => GRADE_COLORS[grade] || UNKNOWN_COLOR;

export const gradeStyle = (grade) => ({ '--rarity': gradeColor(grade) });

export const gradeLabelKey = (grade) => (GRADES.includes(grade) ? `grade.${grade}` : null);

export const gradeName = (grade, t) => (gradeLabelKey(grade) ? t(gradeLabelKey(grade)) : null);
