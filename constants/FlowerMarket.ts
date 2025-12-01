/**
 * Flower Market - Seeds available for planting
 * 
 * When leveling up, users choose what to plant.
 * Some flowers are free (rose), others cost coins (tulip, etc.)
 */

export type FlowerTypeId = 'rose' | 'tulip';
// Future: 'daisy' | 'sunflower' | 'berry_bush' | etc.

export interface FlowerSeed {
  id: FlowerTypeId;
  name: string;
  emoji: string;
  description: string;
  price: number; // 0 = free, >0 = costs coins
  unlocked: boolean; // Whether user owns this seed
  rarity: 'common' | 'rare' | 'legendary';
}

// The flower market - all plantable items
export const FLOWER_MARKET: FlowerSeed[] = [
  {
    id: 'rose',
    name: 'Rose',
    emoji: '🌹',
    description: 'A classic symbol of love',
    price: 0, // Free!
    unlocked: true,
    rarity: 'common',
  },
  {
    id: 'tulip',
    name: 'Tulip',
    emoji: '🌷',
    description: 'Elegant and colorful',
    price: 50, // Costs 50 coins
    unlocked: false, // Must purchase
    rarity: 'common',
  },
  // Future flowers can be added here:
  // { id: 'sunflower', name: 'Sunflower', emoji: '🌻', price: 100, ... },
  // { id: 'cherry_blossom', name: 'Cherry Blossom', emoji: '🌸', price: 200, rarity: 'rare', ... },
];

/**
 * Get available (unlocked) flowers for planting
 */
export function getAvailableFlowers(unlockedIds: FlowerTypeId[] = ['rose']): FlowerSeed[] {
  return FLOWER_MARKET.filter(
    (flower) => flower.unlocked || unlockedIds.includes(flower.id)
  );
}

/**
 * Get flower info by ID
 */
export function getFlowerInfo(id: FlowerTypeId): FlowerSeed | undefined {
  return FLOWER_MARKET.find((f) => f.id === id);
}

