export const isRefusal = (failure) => Boolean(failure)
    && Number.isInteger(failure.error)
    && failure.error >= 400
    && failure.error < 500;

export const clientErrorMessage = (failure) => {
    if (!isRefusal(failure)) {
        return null;
    }
    return typeof failure.message === 'string' && failure.message ? failure.message : null;
};

const SENTENCE_END = /[.!?…]$/;

export const joinSentences = (texts) => (texts.length === 1
    ? texts[0]
    : texts.map((text) => (SENTENCE_END.test(text) ? text : `${text}.`)).join(' '));
