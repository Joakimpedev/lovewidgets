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
  // 3 variants, NO decay states - for flowers
  sapling: {
    v1: require('@/assets/garden/sapling/sapling_v1.png'),
    v2: require('@/assets/garden/sapling/sapling_v2.png'),
    v3: require('@/assets/garden/sapling/sapling_v3.png'),
  },
  // Sapling for large plants (pumpkin, watermelon)
  sapling_largeplant: {
    v1: require('@/assets/garden/sapling/sapling_largeplant_v1.png'),
    v2: require('@/assets/garden/sapling/sapling_largeplant_v2.png'),
    v3: require('@/assets/garden/sapling/sapling_largeplant_v3.png'),
  },
  // Sapling for trees (apple_tree)
  sapling_tree: {
    v1: require('@/assets/garden/sapling/sapling_tree_v1.png'),
    v2: require('@/assets/garden/sapling/sapling_tree_v2.png'),
    v3: require('@/assets/garden/sapling/sapling_tree_v3.png'),
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
      fresh: require('@/assets/garden/flowers/tulip/tulip_v1_fresh.png'),
      wilting: require('@/assets/garden/flowers/tulip/tulip_v1_wilting.png'),
      wilted: require('@/assets/garden/flowers/tulip/tulip_v1_wilted.png'),
    },
    v2: {
      fresh: require('@/assets/garden/flowers/tulip/tulip_v2_fresh.png'),
      wilting: require('@/assets/garden/flowers/tulip/tulip_v2_wilting.png'),
      wilted: require('@/assets/garden/flowers/tulip/tulip_v2_wilted.png'),
    },
    v3: {
      fresh: require('@/assets/garden/flowers/tulip/tulip_v3_fresh.png'),
      wilting: require('@/assets/garden/flowers/tulip/tulip_v3_wilting.png'),
      wilted: require('@/assets/garden/flowers/tulip/tulip_v3_wilted.png'),
    },
  },
  morning_glory: {
    v1: {
      fresh: require('@/assets/garden/flowers/morning_glory/morning_glory_v1_fresh.png'),
      wilting: require('@/assets/garden/flowers/morning_glory/morning_glory_v1_wilting.png'),
      wilted: require('@/assets/garden/flowers/morning_glory/morning_glory_v1_wilted.png'),
    },
    v2: {
      fresh: require('@/assets/garden/flowers/morning_glory/morning_glory_v2_fresh.png'),
      wilting: require('@/assets/garden/flowers/morning_glory/morning_glory_v2_wilting.png'),
      wilted: require('@/assets/garden/flowers/morning_glory/morning_glory_v2_wilted.png'),
    },
    v3: {
      fresh: require('@/assets/garden/flowers/morning_glory/morning_glory_v3_fresh.png'),
      wilting: require('@/assets/garden/flowers/morning_glory/morning_glory_v3_wilting.png'),
      wilted: require('@/assets/garden/flowers/morning_glory/morning_glory_v3_wilted.png'),
    },
  },
  pumpkin: {
    v1: {
      fresh: require('@/assets/garden/flowers/pumpkin/pumpkin_v1_fresh.png'),
      wilting: require('@/assets/garden/flowers/pumpkin/pumpkin_v1_wilting.png'),
      wilted: require('@/assets/garden/flowers/pumpkin/pumpkin_v1_wilted.png'),
    },
    v2: {
      fresh: require('@/assets/garden/flowers/pumpkin/pumpkin_v2_fresh.png'),
      wilting: require('@/assets/garden/flowers/pumpkin/pumpkin_v2_wilting.png'),
      wilted: require('@/assets/garden/flowers/pumpkin/pumpkin_v2_wilted.png'),
    },
    v3: {
      fresh: require('@/assets/garden/flowers/pumpkin/pumpkin_v3_fresh.png'),
      wilting: require('@/assets/garden/flowers/pumpkin/pumpkin_v3_wilting.png'),
      wilted: require('@/assets/garden/flowers/pumpkin/pumpkin_v3_wilted.png'),
    },
  },
  apple_tree: {
    v1: {
      fresh: require('@/assets/garden/flowers/apple_tree/apple_tree_v1_fresh.png'),
      wilting: require('@/assets/garden/flowers/apple_tree/apple_tree_v1_wilting.png'),
      wilted: require('@/assets/garden/flowers/apple_tree/apple_tree_v1_wilted.png'),
    },
    v2: {
      fresh: require('@/assets/garden/flowers/apple_tree/apple_tree_v2_fresh.png'),
      wilting: require('@/assets/garden/flowers/apple_tree/apple_tree_v2_wilting.png'),
      wilted: require('@/assets/garden/flowers/apple_tree/apple_tree_v2_wilted.png'),
    },
    v3: {
      fresh: require('@/assets/garden/flowers/apple_tree/apple_tree_v3_fresh.png'),
      wilting: require('@/assets/garden/flowers/apple_tree/apple_tree_v3_wilting.png'),
      wilted: require('@/assets/garden/flowers/apple_tree/apple_tree_v3_wilted.png'),
    },
  },
  watermelon: {
    v1: {
      fresh: require('@/assets/garden/flowers/watermelon/watermelon_v1_fresh.png'),
      wilting: require('@/assets/garden/flowers/watermelon/watermelon_v1_wilting.png'),
      wilted: require('@/assets/garden/flowers/watermelon/watermelon_v1_wilted.png'),
    },
    v2: {
      fresh: require('@/assets/garden/flowers/watermelon/watermelon_v2_fresh.png'),
      wilting: require('@/assets/garden/flowers/watermelon/watermelon_v2_wilting.png'),
      wilted: require('@/assets/garden/flowers/watermelon/watermelon_v2_wilted.png'),
    },
    v3: {
      fresh: require('@/assets/garden/flowers/watermelon/watermelon_v3_fresh.png'),
      wilting: require('@/assets/garden/flowers/watermelon/watermelon_v3_wilting.png'),
      wilted: require('@/assets/garden/flowers/watermelon/watermelon_v3_wilted.png'),
    },
  },
  orchid: {
    v1: {
      fresh: require('@/assets/garden/flowers/orchid/orchid_v1_fresh.png'),
      wilting: require('@/assets/garden/flowers/orchid/orchid_v1_wilting.png'),
      wilted: require('@/assets/garden/flowers/orchid/orchid_v1_wilted.png'),
    },
    v2: {
      fresh: require('@/assets/garden/flowers/orchid/orchid_v2_fresh.png'),
      wilting: require('@/assets/garden/flowers/orchid/orchid_v2_wilting.png'),
      wilted: require('@/assets/garden/flowers/orchid/orchid_v1_wilted.png'), // Using v1 wilted as fallback
    },
    v3: {
      fresh: require('@/assets/garden/flowers/orchid/orchid_v1_fresh.png'), // Using v1 as fallback
      wilting: require('@/assets/garden/flowers/orchid/orchid_v1_wilting.png'), // Using v1 as fallback
      wilted: require('@/assets/garden/flowers/orchid/orchid_v1_wilted.png'), // Using v1 as fallback
    },
  },
  strawberry: {
    v1: {
      fresh: require('@/assets/garden/flowers/strawberry/strawberry_v1_fresh.png'),
      wilting: require('@/assets/garden/flowers/strawberry/strawberry_v1_wilting.png'),
      wilted: require('@/assets/garden/flowers/strawberry/strawberry_v1_wilted.png'),
    },
    v2: {
      fresh: require('@/assets/garden/flowers/strawberry/strawberry_v2_fresh.png'),
      wilting: require('@/assets/garden/flowers/strawberry/strawberry_v2_wilting.png'),
      wilted: require('@/assets/garden/flowers/strawberry/strawberry_v2_wilted.png'),
    },
    v3: {
      fresh: require('@/assets/garden/flowers/strawberry/strawberry_v1_fresh.png'), // Using v1 as fallback
      wilting: require('@/assets/garden/flowers/strawberry/strawberry_v1_wilting.png'), // Using v1 as fallback
      wilted: require('@/assets/garden/flowers/strawberry/strawberry_v1_wilted.png'), // Using v1 as fallback
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
    // Fence (background element, same state always)
    fence: require('@/assets/garden/ground/Fence.png'),
  },
  landmarks: {
    mountain: require('@/assets/garden/landmarks/mountain/mountain.png'),
    windmill: require('@/assets/garden/landmarks/windmill/windmill.png'),
    cooling_tower: require('@/assets/garden/landmarks/cooling_tower/cooling_tower.png'),
  },
  // Decor - Each type has 3 decay stages (fresh, wilting, wilted)
  // NO variants (v1, v2, v3) - decor items are consistent
  // NO sapling stage - decor items show immediately when planted
  birdbath: {
    fresh: require('@/assets/garden/decor/birdbath/birdbath_fresh.png'),
    wilting: require('@/assets/garden/decor/birdbath/birdbath_wilting.png'),
    wilted: require('@/assets/garden/decor/birdbath/birdbath_wilted.png'),
  },
  garden_gnome: {
    fresh: require('@/assets/garden/decor/garden_gnome/garden_gnome_fresh.png'),
    wilting: require('@/assets/garden/decor/garden_gnome/garden_gnome_wilting.png'),
    wilted: require('@/assets/garden/decor/garden_gnome/garden_gnome_wilted.png'),
  },
  pink_flamingo: {
    fresh: require('@/assets/garden/decor/pink_flamingo/pink_flamingo_fresh.png'),
    wilting: require('@/assets/garden/decor/pink_flamingo/pink_flamingo_wilting.png'),
    wilted: require('@/assets/garden/decor/pink_flamingo/pink_flamingo_wilted.png'),
  },
  pond: {
    fresh: require('@/assets/garden/decor/pond/pond_fresh.png'),
    wilting: require('@/assets/garden/decor/pond/pond_wilting.png'),
    wilted: require('@/assets/garden/decor/pond/pond_wilted.png'),
  },
  telescope: {
    fresh: require('@/assets/garden/decor/telescope/telescope_fresh.png'),
    wilting: require('@/assets/garden/decor/telescope/telescope_wilting.png'),
    wilted: require('@/assets/garden/decor/telescope/telescope_wilted.png'),
  },
  campfire: {
    fresh: require('@/assets/garden/decor/campfire/campfire_fresh.png'),
    wilting: require('@/assets/garden/decor/campfire/campfire_wilting.png'),
    wilted: require('@/assets/garden/decor/campfire/campfire_wilted.png'),
  },
  lawnchair: {
    fresh: require('@/assets/garden/decor/lawnchair/lawnchair_fresh.png'),
    wilting: require('@/assets/garden/decor/lawnchair/lawnchair_wilting.png'),
    wilted: require('@/assets/garden/decor/lawnchair/lawnchair_wilted.png'),
  },
};

// ============================================
// AFFECTION ICONS
// ============================================

export const AffectionAssets = {
  kiss: null, // require('@/assets/icons/affection/kiss.png'),
  hug: null, // require('@/assets/icons/affection/hug.png'),
  letter: null, // require('@/assets/icons/affection/letter.png'),
  gift: require('@/assets/icons/ui/gift.png'),
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
  moon: require('@/assets/icons/ui/moon.png'),
  heart: require('@/assets/icons/ui/heart.png'),
  coin: require('@/assets/icons/ui/coin.png'),
  waterDroplet: require('@/assets/icons/ui/water_droplet.png'),
  inkPen: require('@/assets/icons/ui/inkpen.png'),
  doodle: require('@/assets/icons/ui/doodle.png'),
};

// ============================================
// HUB ICONS (Main navigation cards)
// ============================================

export const HubAssets = {
  sendLove: require('@/assets/icons/hubs/send_love.png'),
  activities: require('@/assets/icons/hubs/activities.png'),
  gardenShop: require('@/assets/icons/hubs/gardenshop.png'),
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

export type FlowerType = 'rose' | 'tulip' | 'morning_glory' | 'pumpkin' | 'apple_tree' | 'watermelon' | 'orchid' | 'strawberry';
export type FlowerVariant = 'v1' | 'v2' | 'v3';
export type HealthStatus = 'fresh' | 'wilting' | 'wilted';

// ============================================
// ASSET GETTERS (with fallback support)
// ============================================

/**
 * Get plant category (flower, large plant, or tree)
 */
export function getPlantCategory(type: FlowerType): 'flower' | 'largeplant' | 'tree' {
  // Large plants
  if (type === 'pumpkin' || type === 'watermelon') {
    return 'largeplant';
  }
  // Trees
  if (type === 'apple_tree') {
    return 'tree';
  }
  // Everything else is a flower
  return 'flower';
}

/**
 * Get sapling asset for a specific plant type and variant (no decay states)
 */
export function getSaplingAsset(type: FlowerType, variant: FlowerVariant): any {
  const category = getPlantCategory(type);
  const saplingKey = category === 'flower' ? 'sapling' : 
                     category === 'largeplant' ? 'sapling_largeplant' : 
                     'sapling_tree';
  return (GardenAssets as any)[saplingKey]?.[variant] || null;
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
 * Get fence asset (same state always, no health variations)
 */
export function getFenceAsset(): any {
  return GardenAssets.ground?.fence || null;
}

/**
 * Get landmark asset for a specific landmark type
 */
export function getLandmarkAsset(type: 'mountain' | 'windmill' | 'cooling_tower'): any {
  return GardenAssets.landmarks?.[type] || null;
}

/**
 * Get decor asset for a specific decor type and health status
 * Decor items behave like flowers but always show mature stage (no sapling)
 * Decor items have NO variants - just decay states
 */
export function getDecorAsset(
  type: string,
  status: HealthStatus
): any {
  return (GardenAssets as any)[type]?.[status] || null;
}

/**
 * Check if an asset exists
 */
export function hasAsset(asset: any): boolean {
  return asset !== null && asset !== undefined;
}
