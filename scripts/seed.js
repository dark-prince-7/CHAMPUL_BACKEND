const { sequelize } = require('../config/database');
const StoreItem = require('../models/StoreItem');

const boards = [
    { id: 'b01', name: 'Classic Lavender', category: 'board', price: 0, rarity: 'common', metadata: { themeId: 0 } },
    { id: 'b02', name: 'Neon Arcade', category: 'board', price: 500, rarity: 'rare', metadata: { themeId: 1 } },
    { id: 'b03', name: 'Royal Marble', category: 'board', price: 1200, rarity: 'epic', metadata: { themeId: 2 } },
    { id: 'b04', name: 'Minimal Glass', category: 'board', price: 800, rarity: 'rare', metadata: { themeId: 3 } },
    { id: 'b05', name: 'Wooden Heritage', category: 'board', price: 600, rarity: 'common', metadata: { themeId: 4 } },
    { id: 'b06', name: 'Cyber Grid', category: 'board', price: 1500, rarity: 'epic', metadata: { themeId: 5 } },
    { id: 'b07', name: 'Pastel Playful', category: 'board', price: 400, rarity: 'common', metadata: { themeId: 6 } },
    { id: 'b08', name: 'Cosmic Galaxy', category: 'board', price: 2000, rarity: 'legendary', metadata: { themeId: 7 } },
    { id: 'b09', name: 'Gold Luxury', category: 'board', price: 5000, rarity: 'legendary', metadata: { themeId: 8 } },
    { id: 'b10', name: 'Anime Vibrant', category: 'board', price: 700, rarity: 'rare', metadata: { themeId: 9 } },
    { id: 'b11', name: 'Matte Esports', category: 'board', price: 1800, rarity: 'epic', metadata: { themeId: 10 } },
    { id: 'b12', name: 'Diamond Throne', category: 'board', price: 100000, rarity: 'legendary', metadata: { themeId: 11 } },
    { id: 'b13', name: 'Royal Persian Carpet', category: 'board', price: 150000, rarity: 'legendary', metadata: { themeId: 12 } },
    { id: 'b14', name: 'Golden Mughal Court', category: 'board', price: 200000, rarity: 'legendary', metadata: { themeId: 13 } }
];

const pieces = [
    { id: 'p01', name: 'Classic Tokens', category: 'piece', price: 0, rarity: 'common', metadata: { setId: 0 } },
    { id: 'p02', name: 'Neon Glow', category: 'piece', price: 300, rarity: 'rare', metadata: { setId: 1 } },
    { id: 'p03', name: 'Royal Gems', category: 'piece', price: 800, rarity: 'epic', metadata: { setId: 2 } },
    { id: 'p04', name: 'Glass Orbs', category: 'piece', price: 500, rarity: 'rare', metadata: { setId: 3 } },
    { id: 'p05', name: 'Wooden Coins', category: 'piece', price: 200, rarity: 'common', metadata: { setId: 4 } },
    { id: 'p06', name: 'Cyber Hex', category: 'piece', price: 1000, rarity: 'epic', metadata: { setId: 5 } },
    { id: 'p07', name: 'Candy Drops', category: 'piece', price: 250, rarity: 'common', metadata: { setId: 6 } },
    { id: 'p08', name: 'Star Tokens', category: 'piece', price: 400, rarity: 'rare', metadata: { setId: 7 } },
    { id: 'p09', name: 'Shield Crests', category: 'piece', price: 600, rarity: 'rare', metadata: { setId: 8 } },
    { id: 'p10', name: 'Pixel Blocks', category: 'piece', price: 350, rarity: 'common', metadata: { setId: 9 } },
    { id: 'p11', name: 'Chrome Rings', category: 'piece', price: 1200, rarity: 'epic', metadata: { setId: 10 } }
];

const cowries = [
    { id: 'c01', name: 'Classic Ivory', category: 'cowrie', price: 0, rarity: 'common', metadata: { setId: 0 } },
    { id: 'c02', name: 'Neon Pulse', category: 'cowrie', price: 400, rarity: 'rare', metadata: { setId: 1 } },
    { id: 'c03', name: 'Golden Imperial', category: 'cowrie', price: 1000, rarity: 'epic', metadata: { setId: 2 } },
    { id: 'c04', name: 'Crystal Ice', category: 'cowrie', price: 600, rarity: 'rare', metadata: { setId: 3 } },
    { id: 'c05', name: 'Rose Quartz', category: 'cowrie', price: 300, rarity: 'common', metadata: { setId: 4 } },
    { id: 'c06', name: 'Obsidian Dark', category: 'cowrie', price: 250, rarity: 'common', metadata: { setId: 5 } },
    { id: 'c07', name: 'Ocean Pearl', category: 'cowrie', price: 500, rarity: 'rare', metadata: { setId: 6 } },
    { id: 'c08', name: 'Cherry Blossom', category: 'cowrie', price: 350, rarity: 'common', metadata: { setId: 7 } },
    { id: 'c09', name: 'Emerald Jade', category: 'cowrie', price: 800, rarity: 'epic', metadata: { setId: 8 } },
    { id: 'c10', name: 'Cosmic Void', category: 'cowrie', price: 1200, rarity: 'epic', metadata: { setId: 9 } },
    { id: 'c11', name: 'Sunset Ember', category: 'cowrie', price: 450, rarity: 'rare', metadata: { setId: 10 } },
    { id: 'c12', name: 'Brown Earth', category: 'cowrie', price: 200, rarity: 'common', metadata: { setId: 11 } },
    { id: 'c13', name: 'Terracotta Flame', category: 'cowrie', price: 300, rarity: 'common', metadata: { setId: 12 } },
    { id: 'c14', name: 'Sandy Dune', category: 'cowrie', price: 250, rarity: 'common', metadata: { setId: 13 } },
    { id: 'c15', name: 'Midnight Forest', category: 'cowrie', price: 600, rarity: 'rare', metadata: { setId: 14 } }
];

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync table
        await StoreItem.sync();

        console.log('Seeding store items...');

        const allItems = [...boards, ...pieces, ...cowries];

        for (const item of allItems) {
            const [record, created] = await StoreItem.findOrCreate({
                where: { id: item.id },
                defaults: item
            });

            if (!created) {
                await record.update(item);
                console.log(`Updated: ${item.name} (${item.id})`);
            } else {
                console.log(`Created: ${item.name} (${item.id})`);
            }
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seed();
