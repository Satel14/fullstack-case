const INDEXES = [
    { table: 'storage', fields: ['userId', 'status'], name: 'storage_user_id_status' },
    { table: 'balance_history', fields: ['userId', 'type'], name: 'balance_history_user_id_type' },
    { table: 'case_opens', fields: ['userId', 'id'], name: 'case_opens_user_id_id' },
];

const indexNames = async (queryInterface, table) => {
    const indexes = await queryInterface.showIndex(table);
    return new Set(indexes.map((i) => i.name));
};

module.exports = {
    async up({ context: queryInterface }) {
        for (const { table, fields, name } of INDEXES) {
            // eslint-disable-next-line no-await-in-loop
            if (!(await indexNames(queryInterface, table)).has(name)) {
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.addIndex(table, fields, { name });
            }
        }
    },

    async down({ context: queryInterface }) {
        for (const { table, name } of INDEXES) {
            // eslint-disable-next-line no-await-in-loop
            if ((await indexNames(queryInterface, table)).has(name)) {
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.removeIndex(table, name);
            }
        }
    },
};
