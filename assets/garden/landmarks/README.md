# Landmark Assets

This folder contains assets for horizon landmark decorations that appear behind the fence in the garden.

## Folder Structure

Each landmark type has its own folder:

- `mountain/` - Mountain landmark assets
- `tree_line/` - Tree line landmark assets  
- `sun/` - Sun landmark assets
- `cloud/` - Cloud landmark assets

## Asset Naming Convention

Please name your landmark assets following this pattern:

- `{landmark_type}.png` - Main asset (e.g., `mountain.png`, `tree_line.png`)
- Or use variants: `{landmark_type}_v1.png`, `{landmark_type}_v2.png`, etc.

## Asset Specifications

- **Size**: Landmarks are displayed at 200x200px as background elements
- **Position**: Positioned at the horizon line (behind the fence)
- **Format**: PNG with transparency
- **Style**: Should match the garden art style

## Adding Assets

1. Place your PNG files in the appropriate landmark folder
2. Update `constants/Assets.ts` to import and use the new assets
3. Update the `Landmark` component in `components/Garden.tsx` to use actual images instead of emoji placeholders







