# Premium Industrial Redesign Plan

Apply high-fidelity product design standards (Linear/Stripe/Vercel) to the Pátio Inteligente Tecnoar.

## User Review Required

> [!IMPORTANT]
> This is a deep visual refactor. It strictly adheres to a 4px grid and a premium industrial aesthetic.

- **Scale**: Multiples of 4px for all spacing.
- **Typography**: Inter (UI) and Space Grotesk (Titles), strictly sized 12-32px.
- **Elevation**: 3 distinct levels (Base, Card, Popover).
- **Interactive**: Hover, Focus, Active, and Disabled states defined globally.

## Proposed Changes

### 1. Global Styles & Design System
- Update `src/styles.css` with a robust 4px spacing scale variables.
- Standardize typography levels and weights.
- Define shared elevation tokens using standard CSS properties (fixing previous `@apply` errors).
- Implement global interactive state utilities (hover, focus rings, active transforms).

### 2. Layout & Density Refinement
- Update `src/routes/__root.tsx` shell to ensure consistent outer margins.
- Refactor `src/shared/components/` and `src/features/` components to use the new spacing variables.
- Audit `src/routes/index.tsx` (Dashboard) for alignment and density.

### 3. Dashboard (TV & Operational)
- Re-design Kanban columns for higher density and better hierarchy.
- Standardize `StatCard` for a cleaner, data-first look.
- Refine TV Mode for maximum legibility and reduced "visual noise".

### 4. Data Visualization
- Apply a "sober" color palette to Recharts across all report routes.
- Replace decorative colors with a functional navy/cyan/gray palette.

## Technical Details
- Using CSS variables for design tokens to ensure dark mode compatibility and stability.
- Avoiding complex Tailwind `@apply` logic that caused previous build failures.
- Implementing `Skeleton` loaders for a smoother data-loading experience.
