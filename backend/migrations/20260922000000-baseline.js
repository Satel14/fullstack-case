const { DataTypes } = require('sequelize');

module.exports = {
    async up({ context: queryInterface }) {
        await queryInterface.createTable('articles', {
            id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
            title: { type: DataTypes.TEXT },
            text: { type: DataTypes.TEXT },
            views: { type: DataTypes.INTEGER },
            created_at: { type: DataTypes.DATE },
            updated_at: { type: DataTypes.DATE },
        });

        await queryInterface.createTable('balance_history', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            userId: { type: DataTypes.INTEGER },
            type: { type: DataTypes.ENUM('payment', 'promocode', 'sellitem', 'opencase', 'bonus', 'sendmoney') },
            balanceChange: { type: DataTypes.INTEGER },
            extraData: { type: DataTypes.STRING },
            created_at: { type: DataTypes.DATE },
        });

        await queryInterface.createTable('bonus_history', {
            id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
            userId: { type: DataTypes.INTEGER },
            bonusId: { type: DataTypes.STRING },
            created_at: { type: DataTypes.DATE },
        });
        await queryInterface.addIndex('bonus_history', ['userId']);

        await queryInterface.createTable('case_opens', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            userId: { type: DataTypes.INTEGER },
            caseId: { type: DataTypes.STRING },
            seedId: { type: DataTypes.INTEGER },
            storageId: { type: DataTypes.INTEGER },
            serverSeedHash: { type: DataTypes.STRING },
            clientSeed: { type: DataTypes.STRING },
            nonce: { type: DataTypes.INTEGER },
            resultItemId: { type: DataTypes.INTEGER },
            resultColor: { type: DataTypes.STRING },
            created_at: { type: DataTypes.DATE },
        });

        await queryInterface.createTable('cases', {
            id: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
            title: { type: DataTypes.STRING },
            price: { type: DataTypes.INTEGER },
            discount: { type: DataTypes.INTEGER },
            categoryId: { type: DataTypes.INTEGER },
            published: { type: DataTypes.INTEGER },
            img: { type: DataTypes.TEXT },
            openedCount: { type: DataTypes.INTEGER },
            type: { type: DataTypes.STRING },
            openLimit: { type: DataTypes.INTEGER },
        });

        await queryInterface.createTable('categories', {
            id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
            title: { type: DataTypes.STRING },
            published: { type: DataTypes.INTEGER },
            priority: { type: DataTypes.INTEGER },
            titleHelp: { type: DataTypes.TEXT },
        });

        await queryInterface.createTable('insider_prices', {
            id: { type: DataTypes.INTEGER },
            name: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
            pricesInCredits: { type: DataTypes.JSON },
            created_at: { type: DataTypes.DATE },
            updated_at: { type: DataTypes.DATE },
        });

        await queryInterface.createTable('items', {
            itemId: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
            name: { type: DataTypes.STRING },
            rare: { type: DataTypes.STRING },
            colors: { type: DataTypes.STRING },
            type: { type: DataTypes.STRING },
            imagePath: { type: DataTypes.STRING },
        });

        await queryInterface.createTable('modules', {
            param: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
            status: { type: DataTypes.INTEGER },
            extraData: { type: DataTypes.JSON },
        });

        await queryInterface.createTable('promocodes', {
            code: { type: DataTypes.STRING, primaryKey: true, allowNull: false },
            description: { type: DataTypes.TEXT },
            bonus: { type: DataTypes.TEXT },
            used_ids: { type: DataTypes.JSON },
            limit: { type: DataTypes.INTEGER },
            created_at: { type: DataTypes.DATE },
            updated_at: { type: DataTypes.DATE },
        });

        await queryInterface.createTable('provably_fair_seeds', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            userId: { type: DataTypes.INTEGER },
            serverSeed: { type: DataTypes.STRING },
            serverSeedHash: { type: DataTypes.STRING },
            clientSeed: { type: DataTypes.STRING },
            nonce: { type: DataTypes.INTEGER, defaultValue: 0 },
            status: { type: DataTypes.ENUM('active', 'revealed'), defaultValue: 'active' },
            created_at: { type: DataTypes.DATE },
            revealed_at: { type: DataTypes.DATE },
        });

        await queryInterface.createTable('storage', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            userId: { type: DataTypes.INTEGER },
            itemId: { type: DataTypes.INTEGER },
            color: { type: DataTypes.STRING },
            caseId: { type: DataTypes.STRING },
            extraData: { type: DataTypes.TEXT },
            status: { type: DataTypes.ENUM('inventory', 'received', 'waitingtrade', 'money') },
            created_at: { type: DataTypes.DATE },
            updated_at: { type: DataTypes.DATE },
        });

        await queryInterface.createTable('users', {
            id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
            login: { type: DataTypes.STRING },
            password: { type: DataTypes.STRING },
            email: { type: DataTypes.TEXT },
            avatar: { type: DataTypes.INTEGER },
            balance: { type: DataTypes.DECIMAL(10, 0) },
            rank: { type: DataTypes.DECIMAL(10, 0) },
            receiveInfo: { type: DataTypes.TEXT },
            role: { type: DataTypes.INTEGER },
            created_at: { type: DataTypes.DATE },
            updated_at: { type: DataTypes.DATE },
        });
    },

    async down({ context: queryInterface }) {
        const tables = [
            'users', 'storage', 'provably_fair_seeds', 'promocodes', 'modules', 'items',
            'insider_prices', 'categories', 'cases', 'case_opens', 'bonus_history',
            'balance_history', 'articles',
        ];
        for (const table of tables) {
            await queryInterface.dropTable(table);
        }
    },
};
