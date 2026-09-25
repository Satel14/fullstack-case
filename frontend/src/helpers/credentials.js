export const PASSWORD_MIN = 6;
export const PASSWORD_MAX_BYTES = 72;

export const utf8Length = (value) => {
    try {
        return encodeURIComponent(value).replace(/%[0-9A-F]{2}/gi, '_').length;
    } catch (e) {
        return Infinity;
    }
};

export const acceptablePassword = (value) => value.length >= PASSWORD_MIN && utf8Length(value) <= PASSWORD_MAX_BYTES;
