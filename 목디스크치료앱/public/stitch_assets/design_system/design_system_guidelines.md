## Brand & Style
The design system is engineered for an orthopedic posture correction environment, prioritizing clinical precision with a supportive, human-centric tone. The brand personality is **authoritative yet accessible**, aiming to evoke feelings of relief, progress, and professional care.

The visual style follows a **Modern Healthcare Minimalist** approach. It leverages generous whitespace to reduce cognitive load—essential for users who may be experiencing physical discomfort. The interface avoids unnecessary decorative elements, relying instead on high-quality medical illustrations and clear typographic hierarchy to guide the user through corrective exercises and data tracking.

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

## Components
- **Buttons:** Primary buttons use the Deep Medical Blue with white text and 12px corner radius. Secondary buttons use a transparent background with a 1px border.
- **Progress Indicators:** Circular rings or thick horizontal bars using Calming Mint for "achieved" states and Light Gray for "remaining" paths.
- **Exercise Cards:** High-quality medical illustrations are centered within 16px rounded cards, with clear "Start" actions positioned at the bottom right.
- **Instructional Icons:** Use a consistent 2px stroke weight with rounded terminals. Icons should be functional and literal (e.g., a spine icon for posture, a clock for duration).
- **Input Fields:** Large tap targets (minimum 48px height) with subtle gray borders that turn Primary Blue on focus.
- **Status Chips:** Small, pill-shaped labels used for difficulty levels (Easy, Intermediate, Advanced) using muted tonal variations of blue and green.