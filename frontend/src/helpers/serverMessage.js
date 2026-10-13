const isClientError = (status) => Number.isInteger(status) && status >= 400 && status < 500;

export const clientErrorMessage = (failure) => {
    if (!failure || !isClientError(failure.error)) {
        return null;
    }
    return typeof failure.message === 'string' && failure.message ? failure.message : null;
};
