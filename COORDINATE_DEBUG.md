# Coordinate System Debug Guide

## The Problem
All flowers are being planted on one line near the bottom, suggesting Y coordinates are always the same (close to 0).

## Coordinate System

### Storage (in PlantedFlower)
- `x`: Center X position (pixels from left edge of screen)
- `y`: Bottom offset (pixels from bottom of flowersLayer, 0-50 range)

### Display
- `left`: Left edge = center X - half flower width
- `bottom`: Used directly from `y` (0 = front/bottom, 50 = back/top)

### Tap Conversion
- `locationX`: Relative to touchable area (should match screen X)
- `locationY`: Relative to touchable area (0 = top, FLOWER_AREA_HEIGHT = bottom)
- Conversion: `y = ((FLOWER_AREA_HEIGHT - locationY) / FLOWER_AREA_HEIGHT) * 50`

## Debugging Steps

1. Check console logs when tapping:
   - What is `locationY`? (should vary from 0 to 196)
   - What is calculated `y`? (should vary from 0 to 50)
   - Are you tapping in different vertical positions?

2. Check if preview sapling appears:
   - Does it show where you tapped?
   - Does it move when you tap different locations?

3. If all Y values are close to 0:
   - locationY is always close to FLOWER_AREA_HEIGHT (bottom)
   - This suggests you're only tapping near bottom, OR
   - locationY coordinate is being calculated incorrectly

## Next Steps
Based on console logs, we can adjust the coordinate conversion or fix the coordinate system.












