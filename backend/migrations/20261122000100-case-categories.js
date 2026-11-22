const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.addColumn('categories', 'slug', { type: DataTypes.STRING(32), allowNull: true });
        await queryInterface.addIndex('categories', ['slug'], { unique: true, name: 'categories_slug_unique' });
        await queryInterface.sequelize.query(
            "UPDATE categories SET slug = 'collections', title = 'CS2 Collections', priority = 60 WHERE id = 1",
        );
    },

    async down({ context: queryInterface }) {
        await queryInterface.sequelize.query(
            "UPDATE categories SET title = 'CS:GO Weapon Cases', priority = 100 WHERE id = 1",
        );
        await queryInterface.removeIndex('categories', 'categories_slug_unique');
        await queryInterface.removeColumn('categories', 'slug');
    },
};
