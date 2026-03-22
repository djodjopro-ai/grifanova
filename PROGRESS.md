# Grifa Website Rebuild - Progress Checkpoint

## Date: 2026-03-23

## Current State
- File: `/Users/apple/Desktop/WEBOVI/GrifaWEB/index.html` (~1930 lines)
- Server: `node serve.mjs` on localhost:3000
- All assets in `images/` folder are ready

## What's Been Done

### 3D Objects (Three.js)
- Three objects: kitchen island (center), wardrobe (far left x=-3.2), bathroom vanity (far right x=3.2)
- All stay as **brass wireframe outlines permanently** (no solid/textured transitions)
- Float/levitate with gentle sine-wave animation
- React only to cursor movement (no scroll reaction)
- Camera stays fixed at y=2.8, z=7.5
- Canvas is `position: fixed; inset: 0; z-index: 0` - visible throughout entire page
- Mobile (<768px): Three.js skipped entirely, CSS fallback image

### Text/Copy Rewrite
- All copy shifted from "furniture maker" to "interior design, manufacturing, and installation"
- Updated: title, meta tags, OG/Twitter, JSON-LD, hero subtitle, manifesto, disciplines heading, all 5 discipline cards, all 3 process rows
- Business framing: Grifa designs, manufactures, and installs custom interiors (kitchens, bathrooms, wardrobes, living rooms, dressers) to client's wishes

### Disciplines Horizontal Scroll (Latest Fix)
- Heading ("Discipline" + "Sta dizajniramo i ugradjujemo") is now OUTSIDE the pinned section, scrolls naturally into view
- Cards are in `#disciplinePanel` (100vh, flex centered) which gets pinned
- Uses GSAP **timeline** with two phases:
  1. Slide phase: track scrolls horizontally until last card fully visible
  2. Dwell phase: one viewport height of extra pinned scroll where nothing moves (so card 05 is fully visible before unpin)
- Progress bar fills proportionally to slide phase only
- **STATUS: User needs to verify the dwell/last-card fix works properly**

### Seamless One-Page Flow
- Body background #0A0A0A as single continuous dark surface
- All sections have transparent backgrounds
- No visible section breaks

### What's Working
- Loader with brass progress bar
- Floating pill nav with glass morphism
- Hero with Three.js 3D wireframe objects
- Manifesto word-by-word reveal
- Disciplines horizontal scroll (timeline with dwell)
- Selected Works with parallax + clip-path wipes
- Materials 2x2 grid
- Process (Atelier) section with clip-path reveals
- Contact + Footer
- Lenis smooth scroll + GSAP ScrollTrigger
- Magnetic buttons, scroll progress bar

## What May Still Need Work
1. **Disciplines dwell** - user hasn't confirmed if the latest timeline fix (slide + dwell phases) fully resolves the "last card not shown" issue
2. **General QA** - no full screenshot QA pass has been done yet
3. **Mobile testing** - not verified beyond basic responsive CSS

## Key Architecture Decisions
- Single `index.html` file, all CSS/JS inline
- Three.js via ES module importmap (three@0.162.0)
- Tailwind CDN with custom palette (noir, stone, brass, brass-light, charcoal, warmwhite)
- Typography: Cormorant Garamond (display), DM Sans (body), Space Mono (labels)
- GSAP 3.12.7 + ScrollTrigger for all animations
- Lenis for smooth scroll
- Puppeteer cannot capture WebGL on this machine - must verify 3D in real browser

## Key Files
- `/Users/apple/Desktop/WEBOVI/GrifaWEB/index.html` - THE file to edit
- `/Users/apple/Desktop/WEBOVI/GrifaWEB/images/walnut-pbr.jpg` - PBR texture for Three.js
- `/Users/apple/Desktop/WEBOVI/GrifaWEB/serve.mjs` - Dev server
- `/Users/apple/Desktop/WEBOVI/GrifaWEB/screenshot.mjs` - Screenshot tool
- `/Users/apple/Desktop/WEBOVI/GrifaWEB/generate-atelier-assets.mjs` - kie.ai asset generation script

## Business Context
Grifa d.o.o. does NOT make standalone furniture. They DESIGN, MANUFACTURE, and INSTALL interior elements:
- Kitchen elements (cabinets, islands, countertops)
- Wardrobes (built-in, sliding door)
- Bathroom vanities
- Living room built-ins (TV walls, shelving)
- Dressers/storage units
