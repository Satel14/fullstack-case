module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.sequelize.query(
            "UPDATE items SET imagePath = CONCAT(LEFT(imagePath, CHAR_LENGTH(imagePath) - 4), '.webp') "
            + "WHERE imagePath LIKE '/img/items/%.png'",
        );
    },

    async down({ context: queryInterface }) {
        await queryInterface.sequelize.query(
            "UPDATE items SET imagePath = CONCAT(LEFT(imagePath, CHAR_LENGTH(imagePath) - 5), '.png') "
            + "WHERE imagePath LIKE '/img/items/%.webp'",
        );
    },
};
