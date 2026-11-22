module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.sequelize.query(
            "UPDATE cases SET img = CONCAT(LEFT(img, CHAR_LENGTH(img) - 4), '.webp') WHERE img LIKE '/img/case/%.png'",
        );
    },

    async down({ context: queryInterface }) {
        await queryInterface.sequelize.query(
            "UPDATE cases SET img = CONCAT(LEFT(img, CHAR_LENGTH(img) - 5), '.png') WHERE img LIKE '/img/case/%.webp'",
        );
    },
};
