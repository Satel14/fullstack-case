export const PASSWORD_MIN = 6;
export const PASSWORD_MAX_BYTES = 72;
export const LOGIN_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;
export const EMAIL_MAX = 254;
export const EMAIL_PATTERN = /^[^\s@\p{C}]+@[^\s@\p{C}]+\.[^\s@\p{C}]+$/u;

export const utf8Length = (value) => {
    try {
        return encodeURIComponent(value).replace(/%[0-9A-F]{2}/gi, '_').length;
    } catch (e) {
        return Infinity;
    }
};

export const acceptablePassword = (value) => value.length >= PASSWORD_MIN && utf8Length(value) <= PASSWORD_MAX_BYTES;

export const acceptableEmail = (value) => value.length <= EMAIL_MAX && EMAIL_PATTERN.test(value);
