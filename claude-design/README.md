# Handoff: AOE2 Battle Sim — Simplified Combat Sim UI

## Overview
A redesign of the Combat Sim screen (`web/src/components/CombatSim.tsx` and its children) aimed at reducing information overload. The current UI stacks every panel — pickers, animated battlefield, verbose damage-math paragraphs, 6 upgrade checklists, a 14-row stat table — always expanded on one long page. This redesign keeps all the same underlying data/logic (`battle.ts`, `approach.ts`, `upgrades.ts`, `types.ts` are untouched) but changes what's visible by default:
- A **Simple / Advanced** mode switch replaces "everything always on."
- **Simple** mode shows only army setup + the animated battlefield + result headline.
- **Advanced** mode additionally reveals the damage-math breakdown, upgrade checklists, and the full stat table — all below a divider, so Simple stays clean.
- Battle results (headline + animation playback) only appear after the user presses **Run Battle**, instead of auto-simulating/rendering on every state change.

## About the Design Files
The file in this bundle (`combat-sim-design.html`) is a **design reference built in HTML/CSS with placeholder data** — it is not production code to copy in verbatim. It doesn't call the real API (`api/data.ts`), doesn't run the real `battle.ts`/`approach.ts` simulation, and doesn't wire up real upgrade state. Recreate this layout and interaction pattern **inside the existing React + TypeScript + Vite app**, wiring it back to the existing hooks/logic (`useRangeDistance`, `applyUpgrades`, `simulateArmyBattle`, `simulateApproachBattle`) exactly as `CombatSim.tsx` does today.

## Fidelity
**High-fidelity** for layout, spacing, and interaction behavior (grid structure, order of elements, what's visible in each mode, the Run Battle gate). The **color/typography tokens shown are NOT this app's tokens** — this mock was built against a separate design system ("Classical": serif/editorial, warm neutrals, gold accent). The real app currently uses its own CSS variables in `web/src/index.css` (`--text`, `--text-h`, `--bg`, `--border`, `--accent`, system-ui sans font, 18px base). Two options:
1. Keep the app's existing look (`--accent: #aa3bff` purple, system-ui sans) and apply only the **layout/interaction** changes described below — recommended, since a full re-skin wasn't requested.
2. If a re-skin is wanted too, the mock's token values are listed under Design Tokens below for reference — but confirm with the user before adopting a new palette/typeface, since it's a different design system than the app ships today.

## Screens / Views

### Combat Sim (single screen, two modes)
**Purpose**: pick two armies, optionally tune upgrades, run a battle, read the outcome.

**Layout** (desktop, max-width 1100px centered, `clamp()` responsive padding):
1. **Header row**: flex, `justify-content: space-between`, wraps on narrow widths.
   - Left: page title ("AOE2 Battle Sim"), same `<h1>` as today.
   - Right: two buttons, "Simple" / "Advanced" — a 2-option toggle (outlined button, active = filled/primary style, inactive = ghost style). Replaces nothing existing; this is new chrome.
   - 1px bottom border under the whole header row.
2. **Army pickers row**: CSS grid, `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))`, `gap: 24px`. Two cards, one per side (reuses `UnitPicker.tsx`'s civ select → unit select → count input, in that order, inside a bordered card container instead of the current unbordered flex column). Each card: small tag/label ("Army A" / "Army B"), civ `<select>`, unit `<select>`, "Count" number input (label + input row, input width ~80px) — all the same three controls `UnitPicker.tsx` already renders, just visually grouped in a card.
3. **Hairline divider** (`<hr>`-equivalent) full width.
4. **Result section**, flex column, gap 16px:
   - Result headline (`BattleReport`'s summary line only — winner, time, survivors, HP%) — **conditionally rendered, only after Run Battle is pressed**. Not shown on initial load.
   - Battlefield animation area (`BattleVisualizer`'s `.battlefield` element) — **always visible**, even before running, at a fixed min-height (~180px), bordered, rounded corners, centered placeholder text when empty.
   - **Run Battle button** directly below the animation area (primary/filled style, left-aligned, generous horizontal padding). This is `BattleVisualizer`'s existing "Simulate Battle" button, just repositioned from above the field to below it, and it now also triggers the headline in step above to appear (today the headline is `BattleReport`, a sibling component that's always rendered — here it should only populate after Run Battle is clicked, or be memoized off pressing the button rather than off unit/count changes).
5. **Advanced section** — **only rendered when mode = Advanced** (independent of whether Run Battle has been pressed):
   - Hairline divider.
   - Damage-math breakdown paragraph(s) — same content as today's `BattleReport` "damage-breakdown" divs, but only shown here, not in Simple mode.
   - Upgrades: CSS grid `repeat(auto-fit, minmax(240px,1fr))`, one card per side. **This is the key consolidation**: today there are 6 separate `UpgradePanel` instances (3 sources × 2 sides, each with its own heading/Select-All/Clear-All). Collapse each side's 3 sources into a single card per side, grouped by age or with sub-headings per source inside one card — checkbox list, same "Select All / Clear All" affordance but not required to be three separate panels.
   - Full stat comparison table (`StatCompare`'s existing 14-row table), wrapped in `overflow-x:auto` for narrow viewports, otherwise unchanged from today's table markup/columns.

**Responsive behavior**: no fixed breakpoints — achieved entirely via `grid-template-columns: repeat(auto-fit, minmax(...))` on both the army-picker row and the upgrade-cards row, so columns naturally collapse to a single column on narrow viewports. Header row uses `flex-wrap: wrap`. No JS resize listeners needed.

## Interactions & Behavior
- **Simple/Advanced toggle**: pure UI state, no data implications — toggling does not re-run or clear the battle result.
- **Run Battle button**: triggers the same simulation `BattleVisualizer.handleSimulate` already does (approach animation + `BattleReport`'s result calc) — the difference from today is only that the result headline should gate on this click too, not render eagerly from `simulateArmyBattle` on every prop change.
- No new loading/error states beyond what `CombatSim.tsx` already handles (null unit/civ guards).
- Upgrade checkboxes, Select All/Clear All: unchanged behavior from `UpgradePanel.tsx`, just restyled into one card per side instead of three.

## State Management
Add to `CombatSim.tsx` (or a new parent state):
- `mode: 'simple' | 'advanced'` — local UI state, no persistence needed unless the user wants it remembered (localStorage optional).
- `hasRun: boolean` — set true on Run Battle click; gates the result headline. Reset to `false` whenever `unitA`/`unitB`/`countA`/`countB`/upgrades change (so stale results aren't shown), mirroring how `BattleVisualizer` already clears its animation state on those same dependencies.
All existing state (`civIdA/B`, `unitA/B`, `countA/B`, `upgradesA/B`, `selectedIdsA/B`) stays as-is.

## Design Tokens
*(Reference only — see Fidelity note above on whether to adopt these or keep the app's current tokens.)*
- Background: `#f3f2f2`, Surface: `#eae9e9`, Text: `#201f1d`
- Accent: `#b68235` (ramp: 100 `#fff3e4` … 700 `#7d5411` … 900 `#3a270d`)
- Neutral ramp: 100 `#f8f4f4` … 500 `#9b9797` … 700 `#605d5d` … 900 `#2d2b2b`
- Divider: `color-mix(in srgb, #201f1d 16%, transparent)`
- Fonts: Cormorant Garamond (headings), Lora (body) — vs. the app's current system-ui sans stack.
- The app's own current tokens (keep these if not re-skinning): `web/src/index.css` — `--text:#6b6375`, `--text-h:#08060d`, `--bg:#fff`, `--border:#e5e4e7`, `--accent:#aa3bff`.

## Assets
None — no icons or images used; all controls are native `<select>`/`<input>`/`<button>` elements, consistent with the existing app.

## Files
- `combat-sim-design.html` — the interactive HTML mock (open in any browser; click Simple/Advanced and Run Battle to see state changes).
- Existing app files this maps to: `web/src/components/CombatSim.tsx`, `UnitPicker.tsx`, `BattleVisualizer.tsx`, `BattleReport.tsx`, `UpgradePanel.tsx`, `StatCompare.tsx`, `RangeModeToggle.tsx`, `web/src/App.css`, `web/src/index.css`.
