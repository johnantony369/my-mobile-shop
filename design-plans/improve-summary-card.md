# Modernize and Deslop SummaryCard UI

Written against: HEAD (commit on main)

## Evidence chain

- Surface: `src/components/SummaryCard.tsx`, rendered inside `src/screens/BookScreen.tsx`
- Problem: The summary card exhibits visual clutter, layout instability (abruptly toggling between two different grids based on arbitrary 10k threshold), artificial spacer hacks (`text-transparent` ghost `-` elements), multi-color badge noise (gray, blue, purple, amber in one row), lack of `tabular-nums`, and arbitrary negative letter-spacing (`tracking-tight`).
- Design evidence: `DESIGN.md` (Sections 1, 2, 3, 4: iOS-inspired minimalist card, grouped cards, `tabular-nums` / `font-mono` for POS numbers, `iosGreen`, `iosRed`, `iosSeparator`) and `baseline-ui` constraints (no `tracking-*`, `size-*` for square elements, single accent dominance, no layout slop).
- Owner: `src/components/SummaryCard.tsx`
- Scope and affected surfaces: `src/components/SummaryCard.tsx`, `tests/creditSummaryCard.test.ts`
- Uncertainty: None; the requirements for retail daily book summaries and test expectations are fully known.

## Design decision

Replace the disjointed dual-layout system and hacky spacer elements with a unified, clean iOS grouped summary card:
1. **Unified Hierarchy**: Make **Net Balance** the clear primary anchor or hero figure, with Cash IN (green, entry count) and Cash OUT (red) neatly paired in a balanced two-column section with a hairline vertical separator. This layout natively accommodates numbers from ₹0 to ₹10,00,000+ without any layout morphing or text collisions.
2. **Typography & Baseline Polish**:
   - Add `tabular-nums` and clean font weight to all monetary figures.
   - Remove arbitrary `tracking-tight` letter-spacing.
   - Replace `w-3.5 h-3.5` and `w-4 h-4` with Tailwind `size-3.5` and `size-4`.
   - Eliminate all artificial spacer hacks (`<span className="text-transparent ...">-</span>`).
3. **Calm Payment Breakdown Strip**:
   - Restyle the Cash / UPI / Card / Credit badges into a cohesive, quiet neutral pill strip (`bg-black/[0.04] text-[#8E8E93] border border-black/[0.04]` with high-contrast amounts).
   - Ensure the Share button is neatly aligned with proper touch targets (44×44px hit box) and standard tactile feedback (`ios-press`).

## Reuse

- Grouped card container: `rounded-[14px] bg-white border border-black/[0.04] shadow-sm` from `DESIGN.md` Section 4.
- Semantic tokens: `text-iosGreen`, `text-iosRed`, `text-iosBlue`, `border-[#E5E5EA]` from `DESIGN.md` Section 2.
- Exemplar: Grouped metric displays in `BookScreen.tsx` and `StockScreen.tsx`.

## Changes

1. `src/components/SummaryCard.tsx`
   - Change: Unify the summary card layout so that it does not jump or break between short and long numbers. Use a hero Net row above or below paired In/Out columns, apply `tabular-nums`, remove `tracking-tight`, replace `w-* h-*` with `size-*`, remove ghost spacers, and calm the multi-colored breakdown pills.
   - Preserve: Share functionality (`buildShareSummaryText`, `shareSummary`), i18n support, and credit pill conditional rendering (`creditTotal > 0`).
   - Verify: Visual inspection and unit tests passing for all ranges of numbers.

2. `tests/creditSummaryCard.test.ts`
   - Change: Update tests to verify the unified clean layout, tabular figures, and credit badge visibility.
   - Preserve: Credit rendering assertions.
   - Verify: `npx vitest run tests/creditSummaryCard.test.ts` passes.

## Scope

- Inherit: `src/screens/BookScreen.tsx` (renders `<SummaryCard />`).
- Verify: `tests/creditSummaryCard.test.ts` and `src/screens/BookScreen.tsx`.
- Exclude: Unrelated screens (Repairs, Stock, Wholesale).

## Validation

- Product: Viewing daily book summaries displays crisp, unclipped financial totals with instant visual hierarchy for Net, In, and Out.
- Interface: Test with zero balances (₹0), small amounts (₹500), and large retail amounts (₹1,50,000). Test on standard mobile viewports (360px - 390px).
- System: Adheres to `DESIGN.md` iOS grouped card aesthetic and passes all `baseline-ui` checks.
- Repository: `npx vitest run tests/creditSummaryCard.test.ts` and `npx tsc --noEmit` pass with exit code 0.

## Stop conditions

- Stop if proposed changes require altering the `DaySummary` data contract or breaking existing export/share integrations.

## Design documentation

- No documentation changes needed; this aligns `SummaryCard.tsx` with already-documented `DESIGN.md` rules.
