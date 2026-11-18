const INDEXES = [
    { table: 'case_opens', name: 'case_opens_created_at' },
    { table: 'balance_history', name: 'balance_history_created_at' },
];

module.exports = {
    async up({ context }) {
        for (const { table, name } of INDEXES) {
            if (!(await context.showIndex(table)).some((index) => index.name === name)) {
                await context.addIndex(table, ['created_at'], { name });
            }
        }
    },

    async down({ context }) {
        for (const { table, name } of INDEXES) {
            if ((await context.showIndex(table)).some((index) => index.name === name)) {
                await context.removeIndex(table, name);
            }
        }
    },
};
