/**
 * Asset Map for LoveWidgets
 * Central location for all image assets
 * 
 * NOTE: If an asset doesn't exist yet, the app will use placeholder components.
 * Add your art files to the paths specified, then the images will automatically appear.
 */

// ============================================
// GARDEN ASSETS
// ============================================

export const GardenAssets = {
  // Sapling - First growth stage (before flowers)
  // 3 variants, NO decay states - same for all flower types
  sapling: {
    v1: require('@/assets/garden/sapling/sapling_v1.png'),
    v2: require('@/assets/garden/sapling/sapling_v2.png'),
    v3: require('@/assets/garden/sapling/sapling_v3.png'),
  },
  
  // Flowers - Each type has 3 variants, each variant has 3 decay stages
  // Variant is chosen randomly to break up monotony
  rose: {
    v1: {
      fresh: require('@/assets/garden/flowers/rose/rose_v1_fresh.png'),
      wilting: require('@/assets/garden/flowers/rose/rose_v1_wilting.png'),
      wilted: require('@/assets/garden/flowers/rose/rose_v1_wilted.png'),
    },
    v2: {
      fresh: require('@/assets/garden/flowers/rose/rose_v2_fresh.png'),
      wilting: require('@/assets/garden/flowers/rose/rose_v2_wilting.png'),
      wilted: require('@/assets/garden/flowers/rose/rose_v2_wilted.png'),
    },
    v3: {
      fresh: require('@/assets/garden/flowers/rose/rose_v3_fresh.png'),
      wilting: require('@/assets/garden/flowers/rose/rose_v3_wilting.png'),
      wilted: require('@/assets/garden/flowers/rose/rose_v3_wilted.png'),
    },
  },
  tulip: {
    v1: {
      fresh: null, // require('@/assets/garden/flowers/tulip/tulip_v1_fresh.png'),
      wilting: null, // require('@/assets/garden/flowers/tulip/tulip_v1_wilting.png'),
      wilted: null, // require('@/assets/garden/flowers/tulip/tulip_v1_wilted.png'),
    },
    v2: {
      fresh: null, // require('@/assets/garden/flowers/tulip/tulip_v2_fresh.png'),
      wilting: null, // require('@/assets/garden/flowers/tulip/tulip_v2_wilting.png'),
      wilted: null, // require('@/assets/garden/flowers/tulip/tulip_v2_wilted.png'),
    },
    v3: {
      fresh: null, // require('@/assets/garden/flowers/tulip/tulip_v3_fresh.png'),
      wilting: null, // require('@/assets/garden/flowers/tulip/tulip_v3_wilting.png'),
      wilted: null, // require('@/assets/garden/flowers/tulip/tulip_v3_wilted.png'),
    },
  },
  ground: {
    // Ground surface (top, where flowers are planted)
    surface_fresh: require('@/assets/garden/ground/ground_surface_fresh.png'),
    surface_wilting: require('@/assets/garden/ground/ground_surface_wilting.png'),
    surface_wilted: require('@/assets/garden/ground/ground_surface_wilted.png'),
    // Ground front (depth face below surface)
    front_fresh: require('@/assets/garden/ground/ground_front_fresh.png'),
    front_wilting: require('@/assets/garden/ground/ground_front_wilting.png'),
    front_wilted: require('@/assets/garden/ground/ground_front_wilted.png'),
  },
};

// ============================================
// AFFECTION ICONS
// ============================================

export const AffectionAssets = {
  kiss: null, // require('@/assets/icons/affection/kiss.png'),
  hug: null, // require('@/assets/icons/affection/hug.png'),
  letter: null, // require('@/assets/icons/affection/letter.png'),
  gift: null, // require('@/assets/icons/affection/gift.png'),
};

// ============================================
// GAME ICONS
// ============================================

export const GameAssets = {
  tictactoe: null, // require('@/assets/icons/games/tictactoe.png'),
  questions: null, // require('@/assets/icons/games/questions.png'),
  trivia: null, // require('@/assets/icons/games/trivia.png'),
  whiteboard: null, // require('@/assets/icons/games/whiteboard.png'),
};

// ============================================
// UI ASSETS
// ============================================

export const UIAssets = {
  cloud: null, // require('@/assets/icons/ui/cloud.png'),
  moon: null, // require('@/assets/icons/ui/moon.png'),
  heart: null, // require('@/assets/icons/ui/heart.png'),
};

// ============================================
// HUB ICONS (Main navigation cards)
// ============================================

export const HubAssets = {
  sendLove: require('@/assets/icons/hubs/send_love.png'),
  activities: require('@/assets/icons/hubs/activities.png'),
};

// ============================================
// ONBOARDING ASSETS
// ============================================

export const OnboardingAssets = {
  infinity: null, // require('@/assets/onboarding/infinity.png'),
};

// ============================================
// TYPE DEFINITIONS
// ============================================

export type FlowerType = 'rose' | 'tulip';
export type FlowerVariant = 'v1' | 'v2' | 'v3';
export type HealthStatus = 'fresh' | 'wilting' | 'wilted';

// ============================================
// ASSET GETTERS (with fallback support)
// ============================================

/**
 * Get sapling asset for a specific variant (no decay states)
 */
export function getSaplingAsset(variant: FlowerVariant): any {
  return GardenAssets.sapling?.[variant] || null;
}

/**
 * Get flower asset for a specific type, variant, and health status
 */
export function getFlowerAsset(
  type: FlowerType,
  variant: FlowerVariant,
  status: HealthStatus
): any {
  return GardenAssets[type]?.[variant]?.[status] || null;
}

/**
 * Get a random variant for variety
 */
export function getRandomVariant(): FlowerVariant {
  const variants: FlowerVariant[] = ['v1', 'v2', 'v3'];
  return variants[Math.floor(Math.random() * variants.length)];
}

/**
 * Get a deterministic variant based on index (for consistent rendering)
 */
export function getVariantByIndex(index: number): FlowerVariant {
  const variants: FlowerVariant[] = ['v1', 'v2', 'v3'];
  return variants[index % 3];
}

/**
 * Get ground surface asset for a health status
 */
export function getGroundAsset(status: HealthStatus): any {
  return GardenAssets.ground?.[`surface_${status}`] || null;
}

/**
 * Get ground front (depth) asset for a health status
 */
export function getGroundFrontAsset(status: HealthStatus): any {
  return GardenAssets.ground?.[`front_${status}`] || null;
}

/**
 * Check if an asset exists
 */
export function hasAsset(asset: any): boolean {
  return asset !== null && asset !== undefined;
}
