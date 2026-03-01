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
    { id: 'b14', name: 'Golden Mughal Court', category: 'board', price: 200000, rarity: 'legendary', metadata: { themeId: 13 } },
    { id: 'b15', name: 'Arctic Frost', category: 'board', price: 3000, rarity: 'epic', metadata: { themeId: 14 } },
    { id: 'b16', name: 'Bamboo Garden', category: 'board', price: 1000, rarity: 'rare', metadata: { themeId: 15 } },
    { id: 'b17', name: 'Celestial Mandala', category: 'board', price: 8000, rarity: 'legendary', metadata: { themeId: 16 } },
    { id: 'b18', name: 'Cherry Blossom', category: 'board', price: 2500, rarity: 'epic', metadata: { themeId: 17 } },
    { id: 'b19', name: 'Copper Forge', category: 'board', price: 4000, rarity: 'epic', metadata: { themeId: 18 } },
    { id: 'b20', name: 'Sand Dunes', category: 'board', price: 1500, rarity: 'rare', metadata: { themeId: 19 } },
    { id: 'b21', name: 'Volcanic Stone', category: 'board', price: 6000, rarity: 'legendary', metadata: { themeId: 20 } }
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
    { id: 'p11', name: 'Chrome Rings', category: 'piece', price: 1200, rarity: 'epic', metadata: { setId: 10 } },
    { id: 'p12', name: 'Lotus Bloom', category: 'piece', price: 1500, rarity: 'epic', metadata: { setId: 11 } },
    { id: 'p13', name: 'Dragon Scale', category: 'piece', price: 2000, rarity: 'legendary', metadata: { setId: 12 } },
    { id: 'p14', name: 'Compass Rose', category: 'piece', price: 1800, rarity: 'epic', metadata: { setId: 13 } },
    { id: 'p15', name: 'Runic Sigil', category: 'piece', price: 2500, rarity: 'legendary', metadata: { setId: 14 } },
    { id: 'p16', name: 'Crown Jewels', category: 'piece', price: 3000, rarity: 'legendary', metadata: { setId: 15 } },
    { id: 'p17', name: 'Phoenix Wings', category: 'piece', price: 3500, rarity: 'legendary', metadata: { setId: 16 } },
    { id: 'p18', name: 'Samurai Crest', category: 'piece', price: 100000, rarity: 'legendary', metadata: { setId: 17 } },
    { id: 'p19', name: 'Cosmic Vortex', category: 'piece', price: 100000, rarity: 'legendary', metadata: { setId: 18 } },
    { id: 'p20', name: 'Ouroboros', category: 'piece', price: 120000, rarity: 'legendary', metadata: { setId: 19 } },
    { id: 'p21', name: 'Thunder Bolt', category: 'piece', price: 100000, rarity: 'legendary', metadata: { setId: 20 } },
    { id: 'p22', name: 'Sacred Scarab', category: 'piece', price: 150000, rarity: 'legendary', metadata: { setId: 21 } },
    { id: 'p23', name: 'Celestial Orb', category: 'piece', price: 120000, rarity: 'legendary', metadata: { setId: 22 } },
    { id: 'p24', name: 'Infinity Knot', category: 'piece', price: 100000, rarity: 'legendary', metadata: { setId: 23 } },
    { id: 'p25', name: 'Eternal Eye', category: 'piece', price: 180000, rarity: 'legendary', metadata: { setId: 24 } },
    { id: 'p26', name: 'Floating Lantern', category: 'piece', price: 100000, rarity: 'legendary', metadata: { setId: 25 } },
    { id: 'p27', name: 'Mechanical Gear', category: 'piece', price: 110000, rarity: 'legendary', metadata: { setId: 26 } },
    { id: 'p28', name: 'Ancient Totem', category: 'piece', price: 130000, rarity: 'legendary', metadata: { setId: 27 } },
    { id: 'p29', name: 'Diamond Cut', category: 'piece', price: 200000, rarity: 'legendary', metadata: { setId: 28 } },
    { id: 'p30', name: 'Viking Rune', category: 'piece', price: 150000, rarity: 'legendary', metadata: { setId: 29 } },
    { id: 'p31', name: 'Spirit Fox', category: 'piece', price: 160000, rarity: 'legendary', metadata: { setId: 30 } },
    { id: 'p32', name: 'Black Hole', category: 'piece', price: 250000, rarity: 'legendary', metadata: { setId: 31 } }
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

// ── Premium UI Themes ──────────────────────────────────────
const themes = [
    { id: 't01', name: 'Midnight Violet', category: 'theme', price: 0, rarity: 'common', description: 'Default dark purple theme', metadata: { bgDeep: '#0A0F1C', accent: '#7C5CFF', accent2: '#F6C177' } },
    { id: 't02', name: 'Ocean Abyss', category: 'theme', price: 500, rarity: 'rare', description: 'Deep sea blue with cyan accents', metadata: { bgDeep: '#041220', accent: '#00BCD4', accent2: '#80DEEA' } },
    { id: 't03', name: 'Blood Moon', category: 'theme', price: 800, rarity: 'rare', description: 'Dark crimson with orange fire glow', metadata: { bgDeep: '#1A0505', accent: '#DC2626', accent2: '#FF8A65' } },
    { id: 't04', name: 'Forest Emerald', category: 'theme', price: 600, rarity: 'rare', description: 'Deep green woodland vibes', metadata: { bgDeep: '#051A0A', accent: '#10B981', accent2: '#A7F3D0' } },
    { id: 't05', name: 'Rose Gold', category: 'theme', price: 1200, rarity: 'epic', description: 'Elegant pink and gold fusion', metadata: { bgDeep: '#1A0F14', accent: '#F472B6', accent2: '#FCD34D' } },
    { id: 't06', name: 'Arctic Aurora', category: 'theme', price: 1500, rarity: 'epic', description: 'Northern lights in frozen tundra', metadata: { bgDeep: '#0A1628', accent: '#38BDF8', accent2: '#34D399' } },
    { id: 't07', name: 'Golden Dynasty', category: 'theme', price: 100000, rarity: 'legendary', description: 'Imperial gold with onyx black', metadata: { bgDeep: '#0D0A00', accent: '#F59E0B', accent2: '#FBBF24' } },
    { id: 't08', name: 'Neon Cyberpunk', category: 'theme', price: 100000, rarity: 'legendary', description: 'Electric neon in dark chrome city', metadata: { bgDeep: '#05000A', accent: '#E879F9', accent2: '#22D3EE' } },
    { id: 't09', name: 'Sakura Night', category: 'theme', price: 120000, rarity: 'legendary', description: 'Japanese cherry blossom twilight', metadata: { bgDeep: '#12050F', accent: '#FB7185', accent2: '#FBCFE8' } },
    { id: 't10', name: 'Diamond Frost', category: 'theme', price: 150000, rarity: 'legendary', description: 'Crystalline ice with diamond sparkle', metadata: { bgDeep: '#08101A', accent: '#E0F2FE', accent2: '#BAE6FD' } },
    { id: 't11', name: 'Volcanic Ember', category: 'theme', price: 180000, rarity: 'legendary', description: 'Molten lava glow from deep earth', metadata: { bgDeep: '#1A0800', accent: '#EF4444', accent2: '#F97316' } },
    { id: 't12', name: 'Celestial Void', category: 'theme', price: 200000, rarity: 'legendary', description: 'Cosmic purple nebula of creation', metadata: { bgDeep: '#050010', accent: '#A78BFA', accent2: '#C4B5FD' } },
];

// ── Premium Avatars (framed portrait identities) ───────────
const avatars = [
    { id: 'a01', name: 'Classic Player', category: 'avatar', price: 0, rarity: 'common', description: 'Default avatar', metadata: { emoji: '😎', frameFill: '#6B7280', frameStroke: '#9CA3AF', bgGrad: '#1a1a2e', shape: 'circle' } },
    { id: 'a02', name: 'Flame Warrior', category: 'avatar', price: 400, rarity: 'rare', description: 'Born from fire and fury', metadata: { emoji: '🔥', frameFill: '#DC2626', frameStroke: '#F97316', bgGrad: '#1A0505', shape: 'circle', badge: '⚔️' } },
    { id: 'a03', name: 'Dragon Lord', category: 'avatar', price: 800, rarity: 'epic', description: 'Ancient dragon rider', metadata: { emoji: '🐲', frameFill: '#059669', frameStroke: '#34D399', bgGrad: '#052E16', shape: 'hexagon', badge: '👑' } },
    { id: 'a04', name: 'Ice Queen', category: 'avatar', price: 600, rarity: 'rare', description: 'Ruler of the frozen realm', metadata: { emoji: '❄️', frameFill: '#0EA5E9', frameStroke: '#BAE6FD', bgGrad: '#0A1628', shape: 'diamond' } },
    { id: 'a05', name: 'Shadow Ninja', category: 'avatar', price: 1000, rarity: 'epic', description: 'Silent assassin of the night', metadata: { emoji: '🥷', frameFill: '#4B5563', frameStroke: '#7C5CFF', bgGrad: '#0A0A1A', shape: 'hexagon', badge: '🌙' } },
    { id: 'a06', name: 'Cosmic Sage', category: 'avatar', price: 1200, rarity: 'epic', description: 'Master of starlight wisdom', metadata: { emoji: '🧙', frameFill: '#7C3AED', frameStroke: '#C4B5FD', bgGrad: '#0F0020', shape: 'circle', badge: '✨' } },
    { id: 'a07', name: 'Golden Emperor', category: 'avatar', price: 100000, rarity: 'legendary', description: 'Supreme ruler of empires', metadata: { emoji: '👑', frameFill: '#D97706', frameStroke: '#FCD34D', bgGrad: '#1A1200', shape: 'hexagon', badge: '💎' } },
    { id: 'a08', name: 'Phoenix Reborn', category: 'avatar', price: 120000, rarity: 'legendary', description: 'Risen from eternal ashes', metadata: { emoji: '🦅', frameFill: '#EA580C', frameStroke: '#FBBF24', bgGrad: '#1A0800', shape: 'diamond', badge: '🔥' } },
    { id: 'a09', name: 'Spirit Wolf', category: 'avatar', price: 100000, rarity: 'legendary', description: 'Guardian of the moonlit forest', metadata: { emoji: '🐺', frameFill: '#6366F1', frameStroke: '#A5B4FC', bgGrad: '#0A0520', shape: 'hexagon', badge: '🌕' } },
    { id: 'a10', name: 'Diamond Titan', category: 'avatar', price: 150000, rarity: 'legendary', description: 'Unbreakable crystalline warrior', metadata: { emoji: '💎', frameFill: '#06B6D4', frameStroke: '#E0F2FE', bgGrad: '#041220', shape: 'diamond', badge: '⚡' } },
    { id: 'a11', name: 'Celestial Fox', category: 'avatar', price: 180000, rarity: 'legendary', description: 'Nine-tailed spirit of the cosmos', metadata: { emoji: '🦊', frameFill: '#F472B6', frameStroke: '#FBCFE8', bgGrad: '#1A0510', shape: 'hexagon', badge: '🌸' } },
    { id: 'a12', name: 'Void Walker', category: 'avatar', price: 200000, rarity: 'legendary', description: 'Traverser of black holes and dimensions', metadata: { emoji: '🕳️', frameFill: '#1E1B4B', frameStroke: '#818CF8', bgGrad: '#020010', shape: 'circle', badge: '♾️' } },
    { id: 'a13', name: 'Thunder God', category: 'avatar', price: 250000, rarity: 'legendary', description: 'Wielder of infinite lightning', metadata: { emoji: '⚡', frameFill: '#FBBF24', frameStroke: '#FEF3C7', bgGrad: '#1A1500', shape: 'hexagon', badge: '🌩️' } },
];

// ── Premium Emotes (in-game chat expressions) ──────────────
const emotes = [
    { id: 'e01', name: 'Wave', category: 'emote', price: 0, rarity: 'common', description: 'Friendly wave greeting', metadata: { emoji: '👋', bubbleColor: '#6B7280' } },
    { id: 'e02', name: 'Thumbs Up', category: 'emote', price: 100, rarity: 'common', description: 'Good move!', metadata: { emoji: '👍', bubbleColor: '#10B981' } },
    { id: 'e03', name: 'Laughing', category: 'emote', price: 150, rarity: 'common', description: 'LOL moment', metadata: { emoji: '😂', bubbleColor: '#F59E0B' } },
    { id: 'e04', name: 'Mind Blown', category: 'emote', price: 300, rarity: 'rare', description: 'Incredible play!', metadata: { emoji: '🤯', bubbleColor: '#E879F9', sparkles: true } },
    { id: 'e05', name: 'Crown', category: 'emote', price: 500, rarity: 'rare', description: 'You are the king!', metadata: { emoji: '👑', bubbleColor: '#FBBF24', sparkles: true } },
    { id: 'e06', name: 'Heart', category: 'emote', price: 200, rarity: 'common', description: 'Spread the love', metadata: { emoji: '❤️', bubbleColor: '#EF4444' } },
    { id: 'e07', name: 'Skull', category: 'emote', price: 400, rarity: 'rare', description: 'Savage move, devastating!', metadata: { emoji: '💀', bubbleColor: '#6B7280', sparkles: true } },
    { id: 'e08', name: 'Rocket Launch', category: 'emote', price: 800, rarity: 'epic', description: 'Going to the moon!', metadata: { emoji: '🚀', bubbleColor: '#3B82F6', sparkles: true } },
    { id: 'e09', name: 'Dragon Fire', category: 'emote', price: 1000, rarity: 'epic', description: 'Unleash the dragon!', metadata: { emoji: '🐉', bubbleColor: '#DC2626', sparkles: true } },
    { id: 'e10', name: 'Lightning Strike', category: 'emote', price: 100000, rarity: 'legendary', description: 'Zeus tier power move', metadata: { emoji: '⚡', bubbleColor: '#FCD34D', sparkles: true } },
    { id: 'e11', name: 'Diamond Hands', category: 'emote', price: 100000, rarity: 'legendary', description: 'Hold the line, never surrender', metadata: { emoji: '💎', bubbleColor: '#06B6D4', sparkles: true } },
    { id: 'e12', name: 'Royal Decree', category: 'emote', price: 120000, rarity: 'legendary', description: 'Bow before the champion', metadata: { emoji: '📜', bubbleColor: '#D97706', sparkles: true } },
    { id: 'e13', name: 'Cosmic Laugh', category: 'emote', price: 150000, rarity: 'legendary', description: 'Echoing through galaxies', metadata: { emoji: '🌌', bubbleColor: '#7C3AED', sparkles: true } },
    { id: 'e14', name: 'Phoenix Blaze', category: 'emote', price: 180000, rarity: 'legendary', description: 'Comeback from the ashes', metadata: { emoji: '🔥', bubbleColor: '#EA580C', sparkles: true } },
    { id: 'e15', name: 'Infinity Flex', category: 'emote', price: 200000, rarity: 'legendary', description: 'Unlimited power flex', metadata: { emoji: '♾️', bubbleColor: '#8B5CF6', sparkles: true } },
];

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync table
        await StoreItem.sync();

        console.log('Seeding store items...');

        const allItems = [...boards, ...pieces, ...cowries, ...themes, ...avatars, ...emotes];

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
