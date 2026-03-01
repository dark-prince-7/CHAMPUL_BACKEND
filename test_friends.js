const fetch = require('node-fetch');

async function run() {
    try {
        const u1 = 'f621ea3f-844a-47d5-b201-1cce45ce7a6b';
        const { sequelize, Friendship, Player } = require('./models');
        await sequelize.authenticate();

        const { Op } = require('sequelize');

        const friendships = await Friendship.findAll({
            where: {
                [Op.or]: [{ requester_id: u1 }, { addressee_id: u1 }]
            },
            include: [
                { model: Player, as: 'requester', attributes: ['id', 'username'] },
                { model: Player, as: 'addressee', attributes: ['id', 'username'] }
            ]
        });

        console.dir(friendships.map(f => f.toJSON()), { depth: null });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
