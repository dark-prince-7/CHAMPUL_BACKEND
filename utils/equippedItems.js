const { PlayerItem, StoreItem, isDatabaseAvailable } = require('../models');

/**
 * Build equippedItems object WITH full metadata for a player.
 * Returns: { board, cowrie, piece, boardMeta, cowrieMeta, pieceMeta }
 * This is used in room creation, room join, socket invite, and the /equipped endpoint.
 */
async function buildEquippedItems(playerId) {
  const result = {
    board: 'b01', cowrie: 'c01', piece: 'p01',
    boardMeta: { themeId: 0 },
    cowrieMeta: { setId: 0 },
    pieceMeta: { pieceSetId: 0 },
  };

  if (!isDatabaseAvailable() || !playerId || playerId.startsWith('guest-')) {
    return result;
  }

  try {
    const items = await PlayerItem.findAll({
      where: { player_id: playerId, equipped: true },
      include: [{ model: StoreItem, as: 'store_item' }],
    });

    items.forEach(pi => {
      if (!pi.store_item || !pi.store_item.category) return;
      const meta = pi.store_item.metadata || {};
      const cat = pi.store_item.category;

      if (cat === 'board') {
        result.board = pi.item_id;
        result.boardMeta = { themeId: meta.themeId ?? 0, ...meta };
      } else if (cat === 'cowrie') {
        result.cowrie = pi.item_id;
        result.cowrieMeta = { setId: meta.setId ?? meta.cowrieId ?? 0, ...meta };
      } else if (cat === 'piece') {
        result.piece = pi.item_id;
        result.pieceMeta = { pieceSetId: meta.pieceSetId ?? meta.setId ?? 0, ...meta };
      }
    });
  } catch (e) {
    console.error('buildEquippedItems error:', e.message);
  }

  return result;
}

module.exports = { buildEquippedItems };
