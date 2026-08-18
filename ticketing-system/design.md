---
name: Nexus Service Desk
colors:
  surface: '#F3F4EE'
  surface-dim: '#E2E3D9'
  surface-bright: '#F9FAF5'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#F1F2EA'
  surface-container: '#EBEDE3'
  surface-container-high: '#E5E7DD'
  surface-container-highest: '#DFE1D6'
  on-surface: '#1A1C18'
  on-surface-variant: '#41474f'
  inverse-surface: '#2F312D'
  inverse-on-surface: '#f0f1eb'
  outline: '#717880'
  outline-variant: '#c1c7d0'
  surface-tint: '#236292'
  primary: '#004872'
  on-primary: '#ffffff'
  primary-container: '#20608f'
  on-primary-container: '#b3d9ff'
  inverse-primary: '#96ccff'
  secondary: '#006c4d'
  on-secondary: '#ffffff'
  secondary-container: '#9df4cc'
  on-secondary-container: '#0f7253'
  tertiary: '#5e3e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#7d5400'
  on-tertiary-container: '#ffcd82'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cee5ff'
  primary-fixed-dim: '#96ccff'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#004a76'
  secondary-fixed: '#9df4cc'
  secondary-fixed-dim: '#81d7b1'
  on-secondary-fixed: '#002115'
  on-secondary-fixed-variant: '#005139'
  tertiary-fixed: '#ffddb0'
  tertiary-fixed-dim: '#f5bd67'
  on-tertiary-fixed: '#281800'
  on-tertiary-fixed-variant: '#614000'
  background: '#f9faf4'
  on-background: '#1a1c19'
  surface-variant: '#e2e3dd'
  sidebar-charcoal: '#2a3139'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 20px
  sidebar-width: 260px
---

## Brand & Style
The design system is engineered for the high-throughput environment of enterprise ticket management. It prioritizes a **Corporate Modern** aesthetic that balances the authority of a legacy service desk with the streamlined efficiency of contemporary SaaS.

The visual narrative centers on clarity and "low cognitive load." By utilizing a warm neutral canvas and a structured charcoal-blue sidebar, the interface creates a clear mental model of navigation versus workspace. The emotional response is one of calm control; even when ticket volumes are high, the UI remains grounded and orderly through the use of intentional whitespace and a restrained color application. There are no decorative gradients or unnecessary motion—every element serves a functional purpose in the resolution of client issues.

## Colors
The palette is governed by an **80/15/5 ratio**. 80% of the interface consists of neutrals—centered around a warm, bone-toned neutral base (#F3F4EE)—to provide a stable and non-fatiguing foundation. 15% is dedicated to Primary Blue for core actions and active navigation. The final 5% is reserved for Semantic Green and status indicators to highlight critical information.

The surface system has been recalibrated for a warm-neutral profile:
- **Surface & Containers:** The base workspace uses the primary neutral. Containers use slightly cooler or warmer shifts to define hierarchy without relying on heavy borders.
- **Primary Blue (#20608f):** Used for primary call-to-actions, active toggle states, and primary data series.
- **Secondary Green (#006c4d):** Reserved for "Success" feedback and positive performance metrics.
- **Sidebar:** Maintains a deep charcoal-blue (#2a3139) to anchor the navigation, providing high contrast against the warm workspace.

## Typography
This design system utilizes **Inter** exclusively to ensure maximum legibility and a systematic, utilitarian feel.

- **Primary Text:** Use high-contrast neutrals (On-Surface) for headlines and body text on the main background to ensure high readability.
- **Secondary Text:** Use variants like `on-surface-variant` for descriptions, timestamps, and metadata to create visual hierarchy.
- **Sidebar Contrast:** On the charcoal sidebar, text must shift to pure white for primary labels and a muted grey for secondary information.
- **Information Density:** For ticket details and data tables, prioritize `body-sm` and `label-md` to maximize density without sacrificing clarity.

## Layout & Spacing
The layout follows a **structured grid model** with a fixed-width sidebar and a fluid content area.

- **Sidebar:** 260px fixed width. Contains the primary navigation.
- **Main Canvas:** Uses a max-width container of 1440px for dashboard views to prevent excessive line lengths on ultra-wide monitors.
- **Grid:** A 12-column grid system is used for dashboard widgets and modular layout sections.
- **Rhythm:** An 8px base unit drives all padding and margins. Use 24px (lg) for major section spacing and 16px (md) for internal card padding.
- **Mobile Adaptivity:** On screens smaller than 768px, the sidebar collapses into a hamburger menu and the main canvas padding reduces to 16px.

## Elevation & Depth
Depth is conveyed through **Low-Contrast Outlines** and subtle tonal shifts rather than heavy shadows, maintaining the "flat" professional aesthetic.

- **The Main Surface:** Uses the off-white background (#F3F4EE) as the base layer.
- **Cards:** White surfaces (#FFFFFF) are used for "active" content containers, creating a natural lift from the warm neutral background.
- **Outlines:** Containers use a 1px solid border in a slightly darker neutral tone than the surface to define boundaries.
- **Shadows:** Only used on "floating" elements like dropdowns, popovers, or modals. Use a single, soft shadow: `0 4px 12px rgba(0, 0, 0, 0.05)`.
- **Sidebar Depth:** The active menu item uses a tonal shift (slightly lighter than the background charcoal) to indicate selection.

## Shapes
The shape language is **Rounded**, reflecting a modern and accessible professional environment.

- **Cards & Containers:** A 12px (`rounded-lg`) corner radius is the standard for all primary content containers and dashboard widgets.
- **Buttons:** A 10px radius (custom) or 8px (`rounded-md`) is used to maintain a balanced look.
- **Inputs:** 8px radius for form fields to provide a slightly sharper, more precise look than the cards they inhabit.
- **Status Pills:** Use a fully rounded (pill-shaped) radius to distinguish them immediately from interactive buttons.

## Components
- **Buttons:** Primary buttons use the Primary Blue with white text. Secondary buttons use a white background with a neutral border and dark text. Hover states should employ a 5% darken overlay.
- **Status Chips:** Small, uppercase labels using the semantic palette. Use a 10% opacity background of the status color with a 100% opacity text color for a modern "tinted" look.
- **Input Fields:** White background, 1px neutral border. On focus, the border shifts to Primary Blue with a 2px soft outer glow.
- **Data Tables:** Row-based with 1px bottom borders. No vertical grid lines. Header text uses `label-sm` in a muted secondary color.
- **Sidebar Nav:** Icons should be 20x20px. Active states feature a 3px vertical "accent bar" on the far left in Primary Blue to guide the eye.
- **Cards:** All dashboard widgets must sit inside a white card. Headers inside cards should use `title-lg` with 16px bottom padding to separate title from content.