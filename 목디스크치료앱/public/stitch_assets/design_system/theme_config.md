---
name: Orthopedic Wellness System
colors:
  surface: '#f9f9ff'
  surface-dim: '#cadbfc'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dfe8ff'
  surface-container-highest: '#d6e3ff'
  on-surface: '#091c35'
  on-surface-variant: '#434654'
  inverse-surface: '#20314b'
  inverse-on-surface: '#ecf0ff'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#4d6359'
  on-secondary: '#ffffff'
  secondary-container: '#cfe8dc'
  on-secondary-container: '#53695f'
  tertiary: '#5e3c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#7d5200'
  on-tertiary-container: '#ffca81'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#cfe8dc'
  secondary-fixed-dim: '#b4ccc0'
  on-secondary-fixed: '#0a1f18'
  on-secondary-fixed-variant: '#364b42'
  tertiary-fixed: '#ffddb3'
  tertiary-fixed-dim: '#ffb950'
  on-tertiary-fixed: '#291800'
  on-tertiary-fixed-variant: '#624000'
  background: '#f9f9ff'
  on-background: '#091c35'
  surface-variant: '#d6e3ff'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  section-gap: 40px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 24px
---

## Brand & Style
The design system is engineered for an orthopedic posture correction environment, prioritizing clinical precision with a supportive, human-centric tone. The brand personality is **authoritative yet accessible**, aiming to evoke feelings of relief, progress, and professional care.

The visual style follows a **Modern Healthcare Minimalist** approach. It leverages generous whitespace to reduce cognitive load—essential for users who may be experiencing physical discomfort. The interface avoids unnecessary decorative elements, relying instead on high-quality medical illustrations and clear typographic hierarchy to guide the user through corrective exercises and data tracking.

## Colors
The palette is rooted in medical trust and biological freshness. 

- **Primary (Deep Medical Blue):** Used for primary actions, branding, and focused states. It represents stability and clinical expertise.
- **Secondary (Calming Mint):** Used for background surfaces, success states, and progress indicators. It provides a "breathable" quality to the UI.
- **Tertiary (Warning/Alert):** A soft amber used sparingly for posture alerts or missed goals to provide contrast without causing alarm.
- **Neutral Grays:** A range of cool-toned grays ensure legibility and structural hierarchy without the harshness of pure black.

## Typography
**Inter** is the sole typeface for this design system, chosen for its exceptional legibility in technical and data-heavy contexts. 

- **Headlines:** Use Semi-Bold weights with slight negative letter-spacing to create a confident, grounded appearance.
- **Body:** Standardized at 16px for optimal readability across all age groups. 
- **Labels:** Use Medium weight and slight tracking to distinguish interactive elements and metadata from static content.
- **Mobile Scaling:** Large display titles scale down significantly on mobile to ensure posture instructions remain "above the fold."

## Layout & Spacing
This design system utilizes a **Fixed-Width Grid** for desktop (12 columns) and a **Fluid Grid** for mobile (4 columns). 

- **Spacing Rhythm:** Based on a 4px baseline grid. All margins and paddings must be multiples of 4.
- **Safe Zones:** A minimum 24px margin is required on mobile to prevent interactive elements from feeling cramped near the edge of the device.
- **Vertical Rhythm:** Generous vertical spacing (40px+) between major sections (e.g., between a progress chart and exercise list) reinforces the minimalist, calm aesthetic.

## Elevation & Depth
Depth is conveyed through **Tonal Layers** rather than heavy shadows to maintain a clean, clinical feel.

- **Level 0 (Base):** Light gray or white background.
- **Level 1 (Cards):** White surfaces with a very soft, 10% opacity blue-tinted shadow (8px blur) or a subtle 1px border (#EBECF0).
- **Interactive States:** On hover or tap, elements should lift slightly using a more pronounced shadow or a subtle primary-colored glow to signify active engagement.
- **Overlays:** Use a 40% opacity neutral-gray backdrop blur for modals to keep the user’s focus on the medical instruction at hand.

## Shapes
The shape language is defined by **Friendly Professionalism**. 

- **Standard Radius:** 0.5rem (8px) for small components like inputs and tags.
- **Container Radius:** 1rem (16px) for cards and main UI containers to soften the "medical" feel.
- **Pills:** Full rounding is reserved exclusively for progress indicators and status chips to distinguish them from actionable buttons.

## Components
- **Buttons:** Primary buttons use the Deep Medical Blue with white text and 12px corner radius. Secondary buttons use a transparent background with a 1px border.
- **Progress Indicators:** Circular rings or thick horizontal bars using Calming Mint for "achieved" states and Light Gray for "remaining" paths.
- **Exercise Cards:** High-quality medical illustrations are centered within 16px rounded cards, with clear "Start" actions positioned at the bottom right.
- **Instructional Icons:** Use a consistent 2px stroke weight with rounded terminals. Icons should be functional and literal (e.g., a spine icon for posture, a clock for duration).
- **Input Fields:** Large tap targets (minimum 48px height) with subtle gray borders that turn Primary Blue on focus.
- **Status Chips:** Small, pill-shaped labels used for difficulty levels (Easy, Intermediate, Advanced) using muted tonal variations of blue and green.