# LoveWidgets Asset Map

This document outlines all the image assets required for the app.

---

## 📁 Folder Structure

```
assets/
├── garden/
│   ├── sapling/            # First growth stage (3 variants, no decay)
│   │   ├── sapling_v1.png
│   │   ├── sapling_v2.png
│   │   └── sapling_v3.png
│   ├── flowers/
│   │   ├── rose/           # 3 variants × 3 decay stages = 9 files
│   │   │   ├── rose_v1_fresh.png
│   │   │   ├── rose_v1_wilting.png
│   │   │   ├── rose_v1_wilted.png
│   │   │   ├── rose_v2_fresh.png
│   │   │   ├── rose_v2_wilting.png
│   │   │   ├── rose_v2_wilted.png
│   │   │   ├── rose_v3_fresh.png
│   │   │   ├── rose_v3_wilting.png
│   │   │   └── rose_v3_wilted.png
│   │   └── tulip/          # 3 variants × 3 decay stages = 9 files
│   │       ├── tulip_v1_fresh.png
│   │       ├── tulip_v1_wilting.png
│   │       ├── tulip_v1_wilted.png
│   │       ├── tulip_v2_fresh.png
│   │       ├── tulip_v2_wilting.png
│   │       ├── tulip_v2_wilted.png
│   │       ├── tulip_v3_fresh.png
│   │       ├── tulip_v3_wilting.png
│   │       └── tulip_v3_wilted.png
│   └── ground/
│       ├── ground_surface_fresh.png   ✅ EXISTS
│       ├── ground_surface_wilting.png ✅ EXISTS
│       ├── ground_surface_wilted.png  ✅ EXISTS
│       ├── ground_front_fresh.png     ✅ EXISTS
│       ├── ground_front_wilting.png   ✅ EXISTS
│       └── ground_front_wilted.png    ✅ EXISTS
├── icons/
│   ├── affection/
│   │   ├── kiss.png
│   │   ├── hug.png
│   │   ├── letter.png
│   │   └── gift.png
│   ├── games/
│   │   ├── tictactoe.png
│   │   ├── questions.png
│   │   ├── trivia.png
│   │   └── whiteboard.png
│   └── ui/
│       ├── cloud.png
│       ├── moon.png
│       └── heart.png
└── onboarding/
    └── infinity.png
```

---

## 🌱 Sapling Assets

The sapling is the **first growth stage** before flowers bloom. 
- 3 variants for visual variety
- **NO decay states** (saplings don't wilt)
- Same sapling for all flower types (rose, tulip, etc.)

### Sapling (`assets/garden/sapling/`)

| Filename | Purpose | Recommended Size |
|----------|---------|-----------------|
| `sapling_v1.png` | Sapling variant 1 | 50×80px |
| `sapling_v2.png` | Sapling variant 2 | 50×80px |
| `sapling_v3.png` | Sapling variant 3 | 50×80px |

---

## 🌸 Flower Assets

Each flower type has **3 variants** (v1, v2, v3) for visual variety.
Each variant has **3 decay stages**:
- `fresh` - Healthy, vibrant
- `wilting` - Starting to droop, colors fading
- `wilted` - Dried out, dead appearance

### Rose (`assets/garden/flowers/rose/`)

| Filename | Purpose | Recommended Size |
|----------|---------|-----------------|
| `rose_v1_fresh.png` | Rose variant 1 - healthy | 100×200px |
| `rose_v1_wilting.png` | Rose variant 1 - wilting | 100×200px |
| `rose_v1_wilted.png` | Rose variant 1 - dead | 100×200px |
| `rose_v2_fresh.png` | Rose variant 2 - healthy | 100×200px |
| `rose_v2_wilting.png` | Rose variant 2 - wilting | 100×200px |
| `rose_v2_wilted.png` | Rose variant 2 - dead | 100×200px |
| `rose_v3_fresh.png` | Rose variant 3 - healthy | 100×200px |
| `rose_v3_wilting.png` | Rose variant 3 - wilting | 100×200px |
| `rose_v3_wilted.png` | Rose variant 3 - dead | 100×200px |

### Tulip (`assets/garden/flowers/tulip/`)

| Filename | Purpose | Recommended Size |
|----------|---------|-----------------|
| `tulip_v1_fresh.png` | Tulip variant 1 - healthy | 100×200px |
| `tulip_v1_wilting.png` | Tulip variant 1 - wilting | 100×200px |
| `tulip_v1_wilted.png` | Tulip variant 1 - dead | 100×200px |
| `tulip_v2_fresh.png` | Tulip variant 2 - healthy | 100×200px |
| `tulip_v2_wilting.png` | Tulip variant 2 - wilting | 100×200px |
| `tulip_v2_wilted.png` | Tulip variant 2 - dead | 100×200px |
| `tulip_v3_fresh.png` | Tulip variant 3 - healthy | 100×200px |
| `tulip_v3_wilting.png` | Tulip variant 3 - wilting | 100×200px |
| `tulip_v3_wilted.png` | Tulip variant 3 - dead | 100×200px |

---

## 🎨 Design Notes for Flowers

### Variant Ideas (for visual variety):
- **v1**: Standard pose, straight stem
- **v2**: Slightly angled, different petal shape
- **v3**: Unique character, perhaps slightly bigger head

### Decay Stages:
- **Fresh**: Bright colors, upright, vibrant
- **Wilting**: Drooping head (5-10°), duller colors, slightly wrinkled
- **Wilted**: Heavily bent, gray/brown tones, dried appearance

### Art Style:
- Combine stem + head in one image (no separate soil)
- Bottom center of image = anchor point
- Transparent background (PNG)
- Soft, cute art style matching the pastel theme

---

## 🌍 Ground Assets

Already created! Ground overlaps with:
- `ground_surface` at z-index 1 (back layer)
- `ground_front` at z-index 5 (front layer, overlaps 30%)

---

## ✅ Checklist

### Sapling
- [x] `sapling/sapling_v1.png`
- [x] `sapling/sapling_v2.png`
- [x] `sapling/sapling_v3.png`

### Garden
- [ ] `rose/rose_v1_fresh.png`
- [ ] `rose/rose_v1_wilting.png`
- [ ] `rose/rose_v1_wilted.png`
- [ ] `rose/rose_v2_fresh.png`
- [ ] `rose/rose_v2_wilting.png`
- [ ] `rose/rose_v2_wilted.png`
- [ ] `rose/rose_v3_fresh.png`
- [ ] `rose/rose_v3_wilting.png`
- [ ] `rose/rose_v3_wilted.png`
- [ ] `tulip/tulip_v1_fresh.png`
- [ ] `tulip/tulip_v1_wilting.png`
- [ ] `tulip/tulip_v1_wilted.png`
- [ ] `tulip/tulip_v2_fresh.png`
- [ ] `tulip/tulip_v2_wilting.png`
- [ ] `tulip/tulip_v2_wilted.png`
- [ ] `tulip/tulip_v3_fresh.png`
- [ ] `tulip/tulip_v3_wilting.png`
- [ ] `tulip/tulip_v3_wilted.png`
- [x] Ground surface (all 3 states)
- [x] Ground front (all 3 states)

### Icons
- [ ] All affection icons
- [ ] All game icons
- [ ] All UI icons
- [ ] Onboarding assets
