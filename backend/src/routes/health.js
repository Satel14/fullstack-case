module.exports = (app) => {
    app.get('/api/health', async (req, res) => {
        const { statusCode, body } = await app.locals.health.check();
        return res.set('Cache-Control', 'no-store').status(statusCode).json(body);
    });
};
