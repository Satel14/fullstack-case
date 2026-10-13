const TABLE = 'storage';
const INDEXES = [
    { fields: ['userId', 'caseId'], name: 'storage_user_id_case_id' },
    { fields: ['userId', 'itemId', 'color'], name: 'storage_user_id_item_id_color' },
];

const indexNames = async (queryInterface) => new Set((await queryInterface.showIndex(TABLE)).map((i) => i.name));

module.exports = {
    async up({ context: queryInterface }) {
        for (const { fields, name } of INDEXES) {
            // eslint-disable-next-line no-await-in-loop
            if (!(await indexNames(queryInterface)).has(name)) {
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.addIndex(TABLE, fields, { name });
            }
        }
    },

    async down({ context: queryInterface }) {
        for (const { name } of INDEXES) {
            // eslint-disable-next-line no-await-in-loop
            if ((await indexNames(queryInterface)).has(name)) {
                // eslint-disable-next-line no-await-in-loop
                await queryInterface.removeIndex(TABLE, name);
            }
        }
    },
};
