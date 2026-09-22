const sequelize = require('../src/config/db');
const { assertMigrationsApplied } = require('../src/db/migrator');
const User = require('../src/models/user');
const AdminActionService = require('../src/services/adminAction');
const ROLES = require('../src/constant/enums/roles');

const main = async () => {
    const login = process.argv[2];
    if (!login) {
        console.error('Usage: node scripts/grantAdmin.js <login>');
        process.exitCode = 1;
        return;
    }

    try {
        await assertMigrationsApplied(sequelize);

        const user = await User.findOne({ where: { user_login: login } });
        if (!user) {
            console.error(`No user with login "${login}".`);
            process.exitCode = 1;
            return;
        }
        if (Number(user.user_role) === ROLES.ADMINISTRATOR) {
            console.log(`"${login}" is already an administrator.`);
            return;
        }

        const before = Number(user.user_role);
        await User.update(
            { user_role: ROLES.ADMINISTRATOR },
            { where: { user_id: user.user_id } },
        );
        await AdminActionService.record({
            adminId: user.user_id,
            action: 'user.grantAdmin',
            targetType: 'user',
            targetId: user.user_id,
            payload: { before, after: ROLES.ADMINISTRATOR },
            reason: 'granted via CLI',
        });

        console.log(`"${login}" (id ${user.user_id}) is now an administrator; previous role ${before}.`);
    } catch (e) {
        console.error(`Failed: ${e.message}`);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
};

main();
