const TABLE = 'storage';
const NAME = 'storage_status_updated_at';

const hasIndex = async (queryInterface) => (await queryInterface.showIndex(TABLE)).some((i) => i.name === NAME);

module.exports = {
    async up({ context: queryInterface }) {
        if (!(await hasIndex(queryInterface))) {
            await queryInterface.addIndex(TABLE, ['status', 'updated_at'], { name: NAME });
        }
    },

    async down({ context: queryInterface }) {
        if (await hasIndex(queryInterface)) {
            await queryInterface.removeIndex(TABLE, NAME);
        }
    },
};
