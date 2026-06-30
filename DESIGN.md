# Timeblock Planner Design System

## 1. Atmosphere & Identity

Timeblock Planner should feel like a quiet workbench: practical, compact, and easy to scan during a real workday. The signature is a restrained teal accent on neutral work surfaces, with clear editing states and no decorative noise.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/page | `--bg` | `#f6f7f9` | N/A | Page background |
| Surface/base | `--surface` | `#ffffff` | N/A | Calendar, log, popover |
| Surface/muted | `--surface-muted` | `#f9fafb` | N/A | Grid, input groups, log shell |
| Text/primary | `--ink` | `#111827` | N/A | Main text and primary buttons |
| Text/secondary | `--muted` | `#6b7280` | N/A | Captions and low-emphasis labels |
| Text/subtle | `--text-subtle` | `#4b5563` | N/A | Table headers and form labels |
| Text/faint | `--text-faint` | `#7a8492` | N/A | Time rail labels |
| Border/default | `--line` | `#d7dde5` | N/A | Containers, inputs, tables |
| Border/subtle | `--line-soft` | `#edf0f4` | N/A | Row dividers and grid lines |
| Accent/base | `--accent` | `#0f9f8f` | N/A | Focus rings and selected event edge |
| Accent/strong | `--accent-strong` | `#087d73` | N/A | Strong hover and active states |
| Accent/soft | `--accent-soft` | `#e8f8f5` | N/A | Status and focused editing backgrounds |
| Danger/base | `--danger` | `#e5484d` | N/A | Delete and conflict edge |
| Warning/base | `--warning` | `#b7791f` | N/A | Reserved warning state |
| Duplicate/base | `--duplicate` | `#4f46e5` | N/A | Duplicate event edge |

### Rules

- Teal is for interaction and state, not decoration.
- Event state colors must remain pale enough that Korean task names stay readable.
- New colors go into `:root` first, then into this table if they serve a reusable semantic role.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Title | `24px` desktop, `20px` mobile | 800 | 1.2 | 0 | App title |
| Section | `15px` | 800 | 1.3 | 0 | Log and popover titles |
| Body | `13px` | 400-800 | 1.5 | 0 | Buttons, rows, event labels |
| Input/mobile | `16px` | 400 | 1.5 | 0 | Mobile textareas and inputs |
| Caption | `11px-12px` | 700-800 | 1.3 | 0 | Time labels, table headers, meta |

### Font Stack

- Primary: `"Wanted Sans", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`
- Mono: not used.
- Serif: not used.

### Rules

- Keep letter spacing at `0` for Korean readability.
- Use heavier weights sparingly for scan targets: title, section labels, table headers, buttons.
- Mobile input text must stay at `16px` or larger to avoid browser zoom.

## 4. Spacing & Layout

### Base Unit

All spacing follows a 4px base even when written directly in vanilla CSS.

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | `4px` | Tight internal offsets |
| `--space-2` | `8px` | Inline gaps, compact row rhythm |
| `--space-3` | `12px` | Form group padding |
| `--space-4` | `16px` | Header and section gaps |
| `--space-6` | `24px` | Page rhythm and bottom spacing |

### Grid

- Max content width: `1120px`.
- Desktop content inset: `24px` each side.
- Tablet content inset: `16px` each side.
- Mobile content inset: `10px` each side.
- Calendar time range: `08:00-19:00`, 5-minute slots.

### Rules

- Calendar geometry uses stable fixed slot heights so drag and resize behavior remains predictable.
- Mobile log rows become stacked editable fields instead of depending on horizontal scroll.
- Do not introduce nested cards; containers are one layer deep.

## 5. Components

### App Header

- **Structure**: Brand block on the left, status pill on the right.
- **States**: Status pill is static and uses accent-soft colors.
- **Accessibility**: Text remains visible at mobile widths; no icon-only state.

### Calendar Event

- **Structure**: Absolutely positioned block with title line and top/bottom resize handles.
- **Variants**: default, compact, selected, overlap, duplicate.
- **States**: hover, selected focus outline, drag cursor, resize handles.
- **Accessibility**: Events are focusable and expose task title through visible text.
- **Motion**: No layout animation; pointer movement directly maps to slot movement.

### Log Table

- **Structure**: Desktop table, mobile stacked editable rows.
- **Variants**: empty state and populated editable state.
- **States**: focus background for edited cells, disabled copy/reset when empty.
- **Accessibility**: Mobile cells expose `data-label` text before editable values.

### Quick Entry

- **Structure**: Label, multiline textarea, submit button.
- **States**: disabled submit while empty, focus ring, mobile full-width submit.
- **Accessibility**: `label` is connected to `textarea`; Ctrl/Cmd+Enter submits without requiring it.

### Popover

- **Structure**: Fixed dialog with title, labeled inputs, time readout, destructive and neutral actions.
- **States**: desktop positioned near event; mobile bottom sheet with backdrop.
- **Accessibility**: Uses `role="dialog"`, `aria-modal`, and `aria-labelledby`.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | `120ms-180ms` | ease | Button hover, active press |
| Standard | `200ms` | ease | Focus and border color transitions |

### Rules

- Animate only `transform`, `opacity`, colors, and borders.
- Every button must have default, hover, active, focus, and disabled states.
- Avoid automatic focus on mobile when it would open the keyboard unexpectedly.

## 7. Depth & Surface

### Strategy

Use a mixed but restrained strategy: borders for primary structure, tonal shifts for grouped controls, and shadows only for floating dialogs.

| Level | Value | Usage |
|-------|-------|-------|
| Border/default | `1px solid var(--line)` | Calendar, log, inputs, grid |
| Border/subtle | `1px solid var(--line-soft)` | Table rows |
| Shadow/dialog | `0 16px 36px var(--shadow-strong)` | Desktop popover |
| Shadow/sheet | `0 -12px 30px var(--shadow-strong)` | Mobile popover |

### Rules

- Page sections are not floating cards inside other cards.
- Shadows are reserved for overlays, not standard containers.
- Use tonal backgrounds for quick-entry and log shells to keep the tool calm and legible.
