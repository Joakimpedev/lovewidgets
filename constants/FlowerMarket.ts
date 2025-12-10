/**
 * Flower Market - Seeds available for planting
 * 
 * When leveling up, users choose what to plant.
 * Some flowers are free (rose), others cost coins (tulip, etc.)
 */

export type FlowerTypeId = 'rose' | 'tulip' | 'morning_glory' | 'pumpkin' | 'apple_tree' | 'watermelon' | 'orchid' | 'strawberry';
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
  {
    id: 'morning_glory',
    name: 'Morning Glory',
    emoji: '🌺',
    description: 'Beautiful morning blooms',
    price: 75, // Costs 75 coins
    unlocked: false, // Must purchase
    rarity: 'common',
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    emoji: '🎃',
    description: 'Autumn favorite',
    price: 12, // Costs 12 coins
    unlocked: false, // Must purchase
    rarity: 'rare',
  },
  {
    id: 'apple_tree',
    name: 'Apple Tree',
    emoji: '🌳',
    description: 'A magnificent tree',
    price: 20, // Costs 20 coins
    unlocked: false, // Must purchase
    rarity: 'legendary',
  },
  {
    id: 'watermelon',
    name: 'Watermelon',
    emoji: '🍉',
    description: 'Sweet summer fruit',
    price: 15, // Costs 15 coins
    unlocked: false, // Must purchase
    rarity: 'rare',
  },
  {
    id: 'orchid',
    name: 'Orchid',
    emoji: '🪷',
    description: 'Elegant and exotic',
    price: 10, // Costs 10 coins
    unlocked: false, // Must purchase
    rarity: 'legendary',
  },
  {
    id: 'strawberry',
    name: 'Strawberry',
    emoji: '🍓',
    description: 'Sweet and juicy',
    price: 18, // Costs 18 coins
    unlocked: false, // Must purchase
    rarity: 'rare',
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

/**
 * Flower Placement Configuration
 * Defines collision radius for each flower type
 * Used for collision detection during manual placement
 * 
 * Rule: A flower can be placed anywhere EXCEPT if its center point
 * falls inside the radius of an existing flower
 */
export const FLOWER_PLACEMENT_CONFIG: Record<FlowerTypeId, { radius: number }> = {
  rose: { radius: 24 }, // Small flower - tight radius
  tulip: { radius: 24 }, // Small flower - tight radius
  morning_glory: { radius: 26 }, // Slightly larger flower
  orchid: { radius: 26 }, // Slightly larger flower
  strawberry: { radius: 22 }, // Small flower - tighter radius
  pumpkin: { radius: 45 }, // Medium-sized plant
  watermelon: { radius: 40 }, // Medium-sized plant
  apple_tree: { radius: 70 }, // Large tree - much larger radius
};

/**
 * Get placement radius for a flower type
 */
export function getFlowerRadius(type: FlowerTypeId): number {
  return FLOWER_PLACEMENT_CONFIG[type]?.radius || 24; // Default to 24px
}

