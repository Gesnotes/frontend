---
name: Academic Clarity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444653'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757684'
  outline-variant: '#c4c5d5'
  surface-tint: '#3755c3'
  primary: '#00288e'
  on-primary: '#ffffff'
  primary-container: '#1e40af'
  on-primary-container: '#a8b8ff'
  inverse-primary: '#b8c4ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#611e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#872d00'
  on-tertiary-container: '#ffa583'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b8c4ff'
  on-primary-fixed: '#001453'
  on-primary-fixed-variant: '#173bab'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdbce'
  tertiary-fixed-dim: '#ffb59a'
  on-tertiary-fixed: '#380d00'
  on-tertiary-fixed-variant: '#802a00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
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
  title-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
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
  base: 4px
  gutter-desktop: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  container-max: 1280px
---

## Brand & Style

The design system focuses on the dual emotional requirements of education: professional authority for administrators and reassuring clarity for parents. The brand personality is grounded, supportive, and efficient. 

The style utilizes a **Corporate / Modern** approach with a high degree of "Digital Softness." By combining a disciplined grid with generous whitespace and soft-edged containers, the UI feels systematic yet approachable. The interface prioritizes information density for desktop data management while shifting to a more spacious, card-based narrative for mobile views.

## Colors

The palette is anchored by a deep **Oxford Blue** (#1E40AF) to signify trust and institutional reliability. This is contrasted against a stark **White** background, layered over a very light **Slate** base (#F8FAFC) to define sectional depth without introducing visual clutter.

**Success Green** (#10B981) is reserved strictly for positive grade movements, validated submissions, and "complete" statuses. Neutral tones range from dark charcoal for headings to a softer slate for secondary metadata, ensuring a clear information hierarchy and high accessibility scores (WCAG AA minimum).

## Typography

The design system uses **Inter** exclusively to ensure maximum legibility across data-heavy tables and small mobile screens. 

- **Headlines:** Use semi-bold weights with slight negative letter-spacing to create a "tight," professional look.
- **Body Text:** Standard 16px for general reading; 14px for data tables and sidebars to maximize information density without sacrificing comfort.
- **Labels:** Uppercase styles for small labels (like "GRADE" or "STATUS") help distinguish metadata from dynamic content.

## Layout & Spacing

This design system utilizes a **8px linear scale** for all spacing and layout decisions.

- **Desktop (Admin/Teacher):** A 12-column fluid grid. Sidebars are fixed at 280px. Data tables should span the full width of the primary content area with 24px internal cell padding.
- **Mobile (Parent):** A single-column layout with 16px side margins. Large vertical spacing (32px) between card modules to reduce cognitive load.
- **Skeleton States:** During data fetches, use shimmering gray blocks that mirror the exact layout of the typography and spacing to prevent layout shift.

## Elevation & Depth

Hierarchy is established using **Tonal Layering** and **Ambient Shadows**.

1.  **Level 0 (Base):** The main application background (#F8FAFC).
2.  **Level 1 (Cards/Sidebar):** Pure white surfaces with a very soft, diffused shadow (0px 4px 20px rgba(0, 0, 0, 0.05)). This is the primary container for student data and grade lists.
3.  **Level 2 (Modals/Popovers):** Elevated surfaces with a more pronounced shadow (0px 10px 30px rgba(0, 0, 0, 0.12)) and a 1px soft gray border.

Interactive elements (buttons) should not use heavy shadows; instead, they use subtle color shifts on hover to maintain a "flat but tactile" feel.

## Shapes

The shape language is defined by **Rounded** geometry (8px / 0.5rem base radius). 

This radius applies to all primary containers, including cards, input fields, and buttons. For larger components like modal overlays, the `rounded-xl` (24px) setting should be used to emphasize the "friendly/reassuring" nature of the parent-facing mobile app. Checkboxes and selection indicators use a smaller 4px radius to maintain precision.

## Components

- **Buttons:** Primary buttons use a solid Oxford Blue fill with white text. Secondary buttons use a transparent background with a 1px border. All buttons have 12px vertical and 24px horizontal padding.
- **Grade Chips:** Small, rounded indicators for grades (e.g., "A+", "B-"). Use the Success Green background for grades above 85% and a neutral slate for others.
- **Data Tables:** Borderless design with subtle row separators (#F1F5F9). Headers are pinned and use the `label-sm` typography style in dark gray.
- **Input Fields:** 8px rounded corners with a 1px border. On focus, the border transitions to Primary Blue with a 3px soft blue outer glow.
- **Cards:** The central component for mobile users. Each card represents a subject or a specific grade entry, featuring a 16px internal padding and an 8px corner radius.
- **Progress Indicators:** Linear horizontal bars for grade averages, using a light gray track and a Primary Blue or Success Green fill.