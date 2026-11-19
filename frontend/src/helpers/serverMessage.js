export const isRefusal = (failure) => Boolean(failure)
    && Number.isInteger(failure.error)
    && failure.error >= 400
    && failure.error < 500;

const CODE = /^[A-Z_]+\.[A-Z_]+$/;

const nonEmptyText = (value) => (typeof value === 'string' && value ? value : null);

const valuesOf = (answer) => (answer.params && typeof answer.params === 'object' && !Array.isArray(answer.params)
    ? answer.params
    : {});

export const serverText = (t, answer) => {
    if (!answer || typeof answer !== 'object') {
        return null;
    }
    const message = nonEmptyText(answer.message);
    if (typeof answer.code !== 'string' || !CODE.test(answer.code)) {
        return message;
    }
    return nonEmptyText(t(`server.${answer.code}`, { ...valuesOf(answer), defaultValue: message || '' }));
};

export const promocodeText = (t, answer) => {
    if (!answer || answer.code !== 'PROMOCODE.ADDED') {
        return serverText(t, answer);
    }
    const { bonus, description } = valuesOf(answer);
    const added = t('server.PROMOCODE.ADDED', { bonus });
    return nonEmptyText(description) && description.trim()
        ? `${added} ${t('server.PROMOCODE.DESCRIPTION', { description })}`
        : added;
};

export const clientErrorMessage = (t, failure) => (isRefusal(failure) ? serverText(t, failure) : null);

const SENTENCE_END = /[.!?…]$/;

export const joinSentences = (texts) => (texts.length === 1
    ? texts[0]
    : texts.map((text) => (SENTENCE_END.test(text) ? text : `${text}.`)).join(' '));
