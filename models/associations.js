const { sequelize } = require('../config/database');

module.exports = () => {
    if (global._CHAMPUL_ASSOCIATIONS_SETUP) return;

    console.log('--- Models in Sequelize before setup:', Object.keys(sequelize.models));

    global._CHAMPUL_ASSOCIATIONS_SETUP = true;
    console.log('--- Setting up associations (ONCE)');

    const UserPlayer = sequelize.model('UserPlayer');
    const Match = sequelize.model('Match');
    const Friendship = sequelize.model('Friendship');
    const StoreItem = sequelize.model('StoreItem');
    const PlayerItem = sequelize.model('PlayerItem');
    const MatchHistory = sequelize.model('MatchHistory');
    const PurchaseHistory = sequelize.model('PurchaseHistory');

    // Match/UserPlayer associations
    UserPlayer.hasMany(Match, { foreignKey: 'winner_id', as: 'wins' });
    Match.belongsTo(UserPlayer, { foreignKey: 'winner_id', as: 'winner' });

    // Friendship associations
    UserPlayer.hasMany(Friendship, { foreignKey: 'requester_id', as: 'sentRequests' });
    UserPlayer.hasMany(Friendship, { foreignKey: 'addressee_id', as: 'receivedRequests' });
    Friendship.belongsTo(UserPlayer, { foreignKey: 'requester_id', as: 'requester' });
    Friendship.belongsTo(UserPlayer, { foreignKey: 'addressee_id', as: 'addressee' });

    // MatchHistory associations
    UserPlayer.hasMany(MatchHistory, { foreignKey: 'player_id', as: 'match_history' });
    MatchHistory.belongsTo(UserPlayer, { foreignKey: 'player_id' });

    // Store associations
    UserPlayer.hasMany(PlayerItem, { foreignKey: 'player_id', as: 'inventory' });
    PlayerItem.belongsTo(UserPlayer, { foreignKey: 'player_id' });

    StoreItem.hasMany(PlayerItem, { foreignKey: 'item_id' });
    PlayerItem.belongsTo(StoreItem, { foreignKey: 'item_id', as: 'store_item' });

    // Purchase history associations
    UserPlayer.hasMany(PurchaseHistory, { foreignKey: 'player_id', as: 'purchases' });
    PurchaseHistory.belongsTo(UserPlayer, { foreignKey: 'player_id' });
    StoreItem.hasMany(PurchaseHistory, { foreignKey: 'item_id' });
    PurchaseHistory.belongsTo(StoreItem, { foreignKey: 'item_id', as: 'store_item' });

    console.log('--- Associations initialized (UserPlayer)');
};
