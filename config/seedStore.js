require('dotenv').config();
const { sequelize } = require('./database');
const { StoreItem } = require('../models');

const STORE_ITEMS = [
    // BOARDS
    { id: 'b01', name: 'Classic Marble', category: 'board', price: 0, currency: 'coins', rarity: 'common', description: 'Classic white marble board with subtle texture.', metadata: { boardBg: '#E8E0D0', cellBg: '#D8D0C0', stroke: '#BBB0A0', homeDeco: 'circles' } },
    { id: 'b02', name: 'Golden Heritage', category: 'board', price: 1200, currency: 'coins', rarity: 'epic', description: 'Gold & amber tones with spiral engravings on home tiles.', metadata: { boardBg: '#F5E6D3', cellBg: '#EDD8C0', stroke: '#C6A650', homeDeco: 'spirals' } },
    { id: 'b03', name: 'Crystal Diamond', category: 'board', price: 300, currency: 'gems', rarity: 'legendary', description: 'Silver crystal board with Celtic knot patterns.', metadata: { boardBg: '#D0D8E8', cellBg: '#C0C8D8', stroke: '#8090A0', homeDeco: 'celtic' } },
    { id: 'b04', name: 'Malachite Luxury', category: 'board', price: 2000, currency: 'coins', rarity: 'legendary', description: 'Natural malachite stone with wood frame border.', metadata: { boardBg: '#E5DDD0', cellBg: '#D5CCC0', stroke: '#A09080', homeDeco: 'nature' } },
    { id: 'b05', name: 'Royal Sapphire', category: 'board', price: 250, currency: 'gems', rarity: 'legendary', description: 'Deep sapphire blue with gemstone-studded home tiles.', metadata: { boardBg: '#1A2040', cellBg: '#252D50', stroke: '#3C5AB4', homeDeco: 'gems' } },
    { id: 'b06', name: 'Obsidian Night', category: 'board', price: 1500, currency: 'coins', rarity: 'epic', description: 'Dark obsidian board with glowing runic symbols.', metadata: { boardBg: '#1A1A2E', cellBg: '#222240', stroke: '#4A4A6A', homeDeco: 'runes' } },
    { id: 'b07', name: 'Rosewood Classic', category: 'board', price: 800, currency: 'coins', rarity: 'rare', description: 'Rich rosewood grain with polished finish.', metadata: { boardBg: '#5C2018', cellBg: '#6B2E20', stroke: '#8B4830', homeDeco: 'circles' } },
    { id: 'b08', name: 'Jade Emperor', category: 'board', price: 400, currency: 'gems', rarity: 'legendary', description: 'Imperial jade with dragon motif home tiles.', metadata: { boardBg: '#0A3020', cellBg: '#0E4030', stroke: '#1A6040', homeDeco: 'dragons' } },
    { id: 'b09', name: 'Sand Dunes', category: 'board', price: 600, currency: 'coins', rarity: 'rare', description: 'Desert sandstone with wave-carved home bases.', metadata: { boardBg: '#D4A76A', cellBg: '#C4975A', stroke: '#A08050', homeDeco: 'waves' } },
    { id: 'b10', name: 'Arctic Frost', category: 'board', price: 1000, currency: 'coins', rarity: 'epic', description: 'Ice-blue frosted glass with snowflake etching.', metadata: { boardBg: '#E0F0FF', cellBg: '#D0E5F8', stroke: '#90B0D0', homeDeco: 'snowflakes' } },
    { id: 'b11', name: 'Volcanic Stone', category: 'board', price: 1800, currency: 'coins', rarity: 'epic', description: 'Dark volcanic rock with ember glow accents.', metadata: { boardBg: '#2A1A10', cellBg: '#3A2A18', stroke: '#5A4030', homeDeco: 'flames' } },
    { id: 'b12', name: 'Ivory Palace', category: 'board', price: 200, currency: 'gems', rarity: 'epic', description: 'Pristine ivory with delicate floral carvings.', metadata: { boardBg: '#FFF8F0', cellBg: '#F5EDE0', stroke: '#D0C0A0', homeDeco: 'floral' } },
    { id: 'b13', name: 'Copper Forge', category: 'board', price: 900, currency: 'coins', rarity: 'rare', description: 'Hammered copper with steampunk gear patterns.', metadata: { boardBg: '#3A2820', cellBg: '#4A3828', stroke: '#8B5A30', homeDeco: 'gears' } },
    { id: 'b14', name: 'Midnight Galaxy', category: 'board', price: 500, currency: 'gems', rarity: 'legendary', description: 'Deep space board with nebula glow and star homes.', metadata: { boardBg: '#080818', cellBg: '#101028', stroke: '#2020A0', homeDeco: 'stars' } },
    { id: 'b15', name: 'Bamboo Garden', category: 'board', price: 500, currency: 'coins', rarity: 'common', description: 'Natural bamboo weave with zen garden styling.', metadata: { boardBg: '#D0C8A0', cellBg: '#C0B890', stroke: '#908060', homeDeco: 'bamboo' } },
    { id: 'b16', name: 'Cherry Blossom', category: 'board', price: 1100, currency: 'coins', rarity: 'epic', description: 'Soft pink with scattered sakura petal motifs.', metadata: { boardBg: '#FFE8F0', cellBg: '#FFD8E4', stroke: '#E0A0B0', homeDeco: 'petals' } },
    { id: 'b17', name: 'Diamond Throne', category: 'board', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Ultra-rare obsidian crystal board with diamond clusters at every corner. The rarest board in existence.', metadata: { boardBg: '#080810', cellBg: '#0c0c20', stroke: '#a0d0ff', homeDeco: 'crystals', themeId: 11 } },
    { id: 'b18', name: 'Royal Persian Carpet', category: 'board', price: 150000, currency: 'coins', rarity: 'legendary', description: 'Hand-knotted Persian silk with 16-petal gold medallion center. A piece of living history.', metadata: { boardBg: '#3a0a0a', cellBg: '#2e0808', stroke: '#c68b3c', homeDeco: 'floral', themeId: 12 } },
    { id: 'b19', name: 'Golden Mughal Court', category: 'board', price: 200000, currency: 'coins', rarity: 'legendary', description: 'Imperial 24-karat gold Mughal arches with onion dome centerpiece. Reserved for emperors.', metadata: { boardBg: '#fdf8f0', cellBg: '#f5efde', stroke: '#b88c0b', homeDeco: 'arches', themeId: 13 } },
    { id: 'b20', name: 'Celestial Mandala', category: 'board', price: 120000, currency: 'coins', rarity: 'legendary', description: 'Sacred geometry mandala with 108-petal lotus. Handcrafted from lapis lazuli and gold leaf.', metadata: { boardBg: '#1a0a2e', cellBg: '#220e3a', stroke: '#c084fc', homeDeco: 'mandala' } },
    { id: 'b21', name: "Emperor's Jade Palace", category: 'board', price: 500, currency: 'gems', rarity: 'legendary', description: 'Carved from solid imperial jade, inlaid with 18k gold veins. Only 12 exist worldwide.', metadata: { boardBg: '#0a2010', cellBg: '#0d2e18', stroke: '#4ade80', homeDeco: 'jade' } },

    // COWRIES
    { id: 'c01', name: 'Pearl White', category: 'cowrie', price: 0, currency: 'coins', rarity: 'common', description: 'Traditional ivory cowrie shells.', metadata: { shellBg: '#F5F0E8', shellStroke: '#C8B898' } },
    { id: 'c02', name: 'Golden Cowrie', category: 'cowrie', price: 800, currency: 'coins', rarity: 'epic', description: 'Gleaming gold-plated cowries with sun motif.', metadata: { shellBg: '#FFD700', shellStroke: '#B8960C' } },
    { id: 'c03', name: 'Crystal Blue', category: 'cowrie', price: 150, currency: 'gems', rarity: 'legendary', description: 'Translucent crystal cowries with ice glow.', metadata: { shellBg: '#00E0FF', shellStroke: '#0090A0' } },
    { id: 'c04', name: 'Jade Cowrie', category: 'cowrie', price: 600, currency: 'coins', rarity: 'rare', description: 'Polished jade cowries with green shimmer.', metadata: { shellBg: '#00A86B', shellStroke: '#007848' } },
    { id: 'c05', name: 'Ruby Ember', category: 'cowrie', price: 200, currency: 'gems', rarity: 'legendary', description: 'Fiery ruby cowries that glow like embers.', metadata: { shellBg: '#E53E6B', shellStroke: '#A02040' } },
    { id: 'c06', name: 'Obsidian Dark', category: 'cowrie', price: 700, currency: 'coins', rarity: 'epic', description: 'Dark obsidian cowries with purple sheen.', metadata: { shellBg: '#2D2D3D', shellStroke: '#4A4A6A' } },
    { id: 'c07', name: 'Bronze Antique', category: 'cowrie', price: 400, currency: 'coins', rarity: 'rare', description: 'Aged bronze cowries with verdigris patina.', metadata: { shellBg: '#CD7F32', shellStroke: '#8B5A20' } },
    { id: 'c08', name: 'Starlight', category: 'cowrie', price: 350, currency: 'gems', rarity: 'legendary', description: 'Ethereal cowries that shimmer like starlight.', metadata: { shellBg: '#E0D0FF', shellStroke: '#A080D0' } },
    { id: 'c09', name: 'Coral Reef', category: 'cowrie', price: 500, currency: 'coins', rarity: 'rare', description: 'Vibrant coral-colored cowries from deep seas.', metadata: { shellBg: '#FF7F50', shellStroke: '#D05030' } },
    { id: 'c10', name: 'Silver Moon', category: 'cowrie', price: 900, currency: 'coins', rarity: 'epic', description: 'Silvery moonlit cowries with crescent marks.', metadata: { shellBg: '#C0C0D0', shellStroke: '#8888A0' } },
    { id: 'c11', name: 'Brown Earth', category: 'cowrie', price: 300, currency: 'coins', rarity: 'common', description: 'Rich dark-brown natural cowries — the original antique look.', metadata: { shellBg: '#5c3317', shellStroke: '#a0522d' } },
    { id: 'c12', name: 'Terracotta Flame', category: 'cowrie', price: 500, currency: 'coins', rarity: 'rare', description: 'Sun-baked terracotta with burnt sienna slit — fired in ancient kilns.', metadata: { shellBg: '#c75c3a', shellStroke: '#6b2c18' } },
    { id: 'c13', name: 'Sandy Dune', category: 'cowrie', price: 400, currency: 'coins', rarity: 'rare', description: 'Pale desert-tan shells bleached by centuries of sun and sea.', metadata: { shellBg: '#e8d5a3', shellStroke: '#b8975a' } },
    { id: 'c14', name: 'Midnight Forest', category: 'cowrie', price: 600, currency: 'coins', rarity: 'rare', description: 'Deep forest green shells harvested under the light of the blood moon.', metadata: { shellBg: '#1a3a2a', shellStroke: '#4ade80' } },
    { id: 'c15', name: 'Diamond Frost', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Hewn from Siberian diamond ice with a pulsing frost aura that chills the air around each shell.', metadata: { shellBg: '#e8f4ff', shellStroke: '#b0d4f1', auraType: 'frost' } },
    { id: 'c16', name: 'Black Pearl', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Tahitian black pearl nacre with a violet nebula aura — darkness given form.', metadata: { shellBg: '#1a1a2e', shellStroke: '#6366f1', auraType: 'blackpearl' } },
    { id: 'c17', name: 'Rose Gold Luxe', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: '18-karat rose gold shells with warm pink sparkle rings that dance around each cowrie.', metadata: { shellBg: '#f4c2c2', shellStroke: '#c27070', auraType: 'rosegold' } },
    { id: 'c18', name: 'Tiger Eye Agate', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Genuine tiger eye gemstone with amber chatoyant wave aura that shifts as you gaze.', metadata: { shellBg: '#b5651d', shellStroke: '#8b4513', auraType: 'tigereye' } },
    { id: 'c19', name: 'Sapphire Royale', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Kashmir sapphire with deep blue star burst aura — chosen by emperors and kings.', metadata: { shellBg: '#1e3a8a', shellStroke: '#60a5fa', auraType: 'sapphire' } },
    { id: 'c20', name: 'Arctic Platinum', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Platinum-rhodium mirror polish with chrome ripple aura. Your opponent sees their defeat reflected.', metadata: { shellBg: '#e5e7eb', shellStroke: '#9ca3af', auraType: 'platinum' } },
    { id: 'c21', name: 'Volcanic Ember', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Forged in volcanic basalt — orange ember aura flickers like living lava. Warning: extreme heat.', metadata: { shellBg: '#7f1d1d', shellStroke: '#f97316', auraType: 'volcanic' } },
    { id: 'c22', name: 'Opal Dreamweaver', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Australian boulder opal with rainbow-shifting prismatic aura. Each roll reveals new colours.', metadata: { shellBg: '#fdf2f8', shellStroke: '#ec4899', auraType: 'opal' } },
    { id: 'c23', name: 'Emerald Sovereign', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Colombian emerald with pulsing green aura glow. The inner luminescence captivates all who witness.', metadata: { shellBg: '#064e3b', shellStroke: '#34d399', auraType: 'emerald' } },
    { id: 'c24', name: 'Celestial Amethyst', category: 'cowrie', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Uruguayan amethyst geode with purple crystal radiance aura — said to bring luck in every roll.', metadata: { shellBg: '#4c1d95', shellStroke: '#a78bfa', auraType: 'amethyst' } },

    // PIECES
    { id: 'p01', name: 'Classic Tokens', category: 'piece', price: 0, currency: 'coins', rarity: 'common', description: 'Simple numbered circles — the original CHAMPUL pieces. Clean, understated, timeless.', metadata: { pieceSetId: 0 } },
    { id: 'p02', name: 'Neon Glow', category: 'piece', price: 1500, currency: 'coins', rarity: 'rare', description: 'Pulsing neon rings with crosshair precision — built for players who dominate under arcade lights.', metadata: { pieceSetId: 1 } },
    { id: 'p03', name: 'Royal Gems', category: 'piece', price: 3000, currency: 'coins', rarity: 'epic', description: 'Faceted diamond shapes with inner refraction lines. Each piece catches light like a ₹5 lakh solitaire.', metadata: { pieceSetId: 2 } },
    { id: 'p04', name: 'Glass Orbs', category: 'piece', price: 2500, currency: 'coins', rarity: 'epic', description: 'Crystal spheres with realistic light refraction, highlights, and bottom reflection arcs. Museum-grade glass art.', metadata: { pieceSetId: 3 } },
    { id: 'p05', name: 'Wooden Coins', category: 'piece', price: 1200, currency: 'coins', rarity: 'rare', description: 'Hand-carved timber tokens with wood grain rings, center knots, and notched edges. Old-world craftsmanship.', metadata: { pieceSetId: 4 } },
    { id: 'p06', name: 'Cyber Hex', category: 'piece', price: 5000, currency: 'coins', rarity: 'epic', description: 'Hexagonal tech discs with circuit traces, LED cores, and corner dots. Cyberpunk precision engineering.', metadata: { pieceSetId: 5 } },
    { id: 'p07', name: 'Candy Drops', category: 'piece', price: 2000, currency: 'coins', rarity: 'rare', description: 'Glossy teardrop sweets with candy-shop shine, stripe bands, and catch lights. Too beautiful to eat.', metadata: { pieceSetId: 6 } },
    { id: 'p08', name: 'Star Tokens', category: 'piece', price: 4000, currency: 'coins', rarity: 'legendary', description: 'Double-layered radiating 5-point stars with inner rotated star overlay and radiating center lines.', metadata: { pieceSetId: 7 } },
    { id: 'p09', name: 'Shield Crests', category: 'piece', price: 6000, currency: 'coins', rarity: 'legendary', description: 'Armoured heraldic shields with inner filigree, chevron marks, rivet studs, and center emblem — fit for medieval royalty.', metadata: { pieceSetId: 8 } },
    { id: 'p10', name: 'Pixel Blocks', category: 'piece', price: 3500, currency: 'coins', rarity: 'epic', description: 'Retro-gaming chunky squares with 3x3 pixel grid, corner notches, and highlight bars. 8-bit nostalgia meets premium design.', metadata: { pieceSetId: 9 } },
    { id: 'p11', name: 'Chrome Rings', category: 'piece', price: 8000, currency: 'coins', rarity: 'legendary', description: 'Triple metallic donut rings with diamond core, metallic highlight arcs. Each ring is hand-polished chrome alloy — the ultimate flex.', metadata: { pieceSetId: 10 } },
    { id: 'p12', name: 'Lotus Bloom', category: 'piece', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Sacred 16-petal lotus mandala carved from Burmese ruby. Each petal catches light differently — a living gemstone flower.', metadata: { pieceSetId: 11 } },
    { id: 'p13', name: 'Dragon Scale', category: 'piece', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Triple-layered serpentine scales forged from meteorite iron. The dragon sigil at the core pulses with ancient power.', metadata: { pieceSetId: 12 } },
    { id: 'p14', name: 'Compass Rose', category: 'piece', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Nautical compass engraved on 22-karat gold disc. Cardinal points inlaid with mother-of-pearl. Navigator\'s treasure.', metadata: { pieceSetId: 13 } },
    { id: 'p15', name: 'Runic Sigil', category: 'piece', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Ancient Norse elder futhark runes inscribed on obsidian disc with phosphorescent ink. Glows in moonlight.', metadata: { pieceSetId: 14 } },
    { id: 'p16', name: 'Crown Jewels', category: 'piece', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Miniature Kohinoor-inspired crown with 7 gemstone tips. Each jewel is a different precious stone — the ultimate royal flex.', metadata: { pieceSetId: 15 } },
    { id: 'p17', name: 'Phoenix Wings', category: 'piece', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Mythical phoenix sculpted from fire opal with spread wings. Said to grant rebirth after every defeat. Mesmerizing.', metadata: { pieceSetId: 16 } },

    // THEMES (full visual experience packages)
    { id: 't01', name: 'Classic Theme', category: 'theme', price: 0, currency: 'coins', rarity: 'common', description: 'The original lavender CHAMPUL experience. Clean, elegant, timeless.', metadata: { themeId: 0 } },
    { id: 't02', name: 'Neon Arcade Theme', category: 'theme', price: 5000, currency: 'coins', rarity: 'epic', description: 'Retro arcade glow with scan lines, neon borders, and LED corners. Pure synthwave energy.', metadata: { themeId: 1 } },
    { id: 't03', name: 'Royal Marble Theme', category: 'theme', price: 8000, currency: 'coins', rarity: 'epic', description: 'Regal white marble with gold filigree corner medallions and luxury gradients.', metadata: { themeId: 2 } },
    { id: 't04', name: 'Minimal Glass Theme', category: 'theme', price: 3000, currency: 'coins', rarity: 'rare', description: 'Frosted translucent elegance — clean lines, subtle gradients, zero clutter.', metadata: { themeId: 3 } },
    { id: 't05', name: 'Wooden Heritage Theme', category: 'theme', price: 6000, currency: 'coins', rarity: 'rare', description: 'Hand-carved walnut with compass rose engraving and aged wood grain textures.', metadata: { themeId: 4 } },
    { id: 't06', name: 'Cyber Grid Theme', category: 'theme', price: 10000, currency: 'coins', rarity: 'epic', description: 'Digital circuit board with data stream rain, hex grid overlay, and pulsing data nodes.', metadata: { themeId: 5 } },
    { id: 't07', name: 'Pastel Playful Theme', category: 'theme', price: 2500, currency: 'coins', rarity: 'rare', description: 'Candy-colored sunshine board with confetti dots, rainbow corners, and playful energy.', metadata: { themeId: 6 } },
    { id: 't08', name: 'Cosmic Galaxy Theme', category: 'theme', price: 15000, currency: 'coins', rarity: 'legendary', description: 'Stardust on the edge of a nebula — twinkling stars, cosmic gradients, and asteroid fields.', metadata: { themeId: 7 } },
    { id: 't09', name: 'Gold Luxury Theme', category: 'theme', price: 20000, currency: 'coins', rarity: 'legendary', description: 'Obsidian and 24k gold for the elite — ornate corner filigree, metallic shimmer overlays.', metadata: { themeId: 8 } },
    { id: 't10', name: 'Anime Vibrant Theme', category: 'theme', price: 12000, currency: 'coins', rarity: 'epic', description: 'Bold manga energy burst with speed lines, action stars, and vibrant color explosions.', metadata: { themeId: 9 } },
    { id: 't11', name: 'Matte Esports Theme', category: 'theme', price: 18000, currency: 'coins', rarity: 'legendary', description: 'Competition-grade dark pro theme — carbon weave texture, tournament HUD styling.', metadata: { themeId: 10 } },
    { id: 't12', name: 'Diamond Throne Theme', category: 'theme', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Ultra-premium obsidian crystal theme — diamond clusters at every corner, aurora borealis lighting.', metadata: { themeId: 11 } },
    { id: 't13', name: 'Royal Persian Theme', category: 'theme', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Hand-knotted Persian silk carpet experience — intricate arabesque medallions, gold thread borders.', metadata: { themeId: 12 } },
    { id: 't14', name: 'Golden Mughal Theme', category: 'theme', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Imperial Mughal court theme — 24k gold arches, onion dome centerpiece, pietra dura inlay.', metadata: { themeId: 13 } },
    { id: 't15', name: 'Celestial Mandala Theme', category: 'theme', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Sacred geometry mandala with 108-petal lotus, lapis lazuli gradients and gold leaf accents.', metadata: { themeId: 14 } },
    { id: 't16', name: 'Jade Palace Theme', category: 'theme', price: 100000, currency: 'coins', rarity: 'legendary', description: 'Carved imperial jade with 18k gold veins — only 12 exist. Zen garden tranquility meets royal opulence.', metadata: { themeId: 15 } }
];

async function seed() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Add missing columns to players table if they don't exist
        try {
            await sequelize.query('ALTER TABLE players ADD COLUMN coins INTEGER DEFAULT 5000');
            console.log('Added coins to players table');
        } catch (e) { /* ignores if exist */ }
        try {
            await sequelize.query('ALTER TABLE players ADD COLUMN gems INTEGER DEFAULT 100');
            console.log('Added gems to players table');
        } catch (e) { /* ignores if exist */ }

        // Sync just the new models
        await sequelize.query("CREATE TABLE IF NOT EXISTS store_items (id VARCHAR(20) PRIMARY KEY, name VARCHAR(100) NOT NULL, category VARCHAR(20) NOT NULL, price INTEGER DEFAULT 0, currency VARCHAR(20) DEFAULT 'coins', rarity VARCHAR(20) DEFAULT 'common', description TEXT, metadata JSONB, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE)");
        await sequelize.query("CREATE TABLE IF NOT EXISTS player_items (id UUID PRIMARY KEY, player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE, item_id VARCHAR(20) NOT NULL REFERENCES store_items(id) ON DELETE CASCADE, category VARCHAR(20) NOT NULL, equipped BOOLEAN DEFAULT false, acquired_at TIMESTAMP WITH TIME ZONE, UNIQUE(player_id, item_id))");


        for (const item of STORE_ITEMS) {
            await StoreItem.upsert(item);
        }
        console.log(`Seeded ${STORE_ITEMS.length} store items successfully.`);
        process.exit(0);
    } catch (error) {
        console.error('Failed to seed:', error);
        process.exit(1);
    }
}

seed();
