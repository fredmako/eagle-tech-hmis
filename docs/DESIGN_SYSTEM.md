# Design system

All UI styling is driven by CSS custom properties defined in `src/index.css`. Update the variables there and the entire UI re-themes — no component changes needed.

## Token map (Tailwind v4 utilities)

| Utility prefix | CSS variable | Purpose |
|---|---|---|
| `bg-background`, `text-foreground` | `--background`, `--foreground` | Page chrome |
| `bg-card`, `text-card-foreground` | `--card`, `--card-foreground` | Card/panel surface |
| `bg-primary`, `text-primary`, `text-primary-foreground` | `--primary`, `--primary-foreground` | Brand color |
| `bg-secondary`, `bg-muted` | `--secondary`, `--muted` | Subtle surfaces |
| `text-fg-strong/body/muted/subtle/faint` | `--fg-*` | Semantic text tones |
| `border-border`, `border-border-subtle/strong/emphasis` | `--border*` | Border weights |
| `bg-brand-from`, `bg-brand-to` + `.brand-gradient` class | `--brand-from`, `--brand-to` | Brand gradient (logo etc.) |
| `bg-chart-{1..5}` | `--chart-*` | Data-viz palette |
| `bg-destructive`, `text-destructive` | `--destructive` | Errors/destruction |
| `rounded-{sm,md,lg,xl,2xl,3xl}` | `--radius` | Radius scale |
| `text-{2xs..7xl}` | `--text-*` | Type scale |
| `font-{normal,medium,semibold,bold,extrabold,black}` | `--font-weight-*` | Weight scale |
| `tracking-{tighter..widest}` | `--tracking-*` | Letter spacing |
| `leading-{none..loose}` | `--leading-*` | Line height |
| `font-{sans,serif,mono,display,body}` | `--font-*` | Font families |
| `shadow-{sm,card,popover,overlay,glow}` | `--shadow-*` | Shadow tokens |
| `duration-{fast,medium,slow,glacial}` | `--duration-*` | Motion durations |

## Light mode

Toggle the `.light` class on `<html>` (the `ThemeToggle` component does this). Light values are defined in the `.light` block of `src/index.css` — edit them to tune.

## Fonts

Only three families are loaded via Google Fonts:
- `font-serif` → Instrument Serif (display headings)
- `font-sans` → DM Sans (body, UI)
- `font-mono` → JetBrains Mono (numbers, data, code)

Adding other fonts requires updating the `@import url(...)` line and the `--font-*` tokens.

## Bulk migration scripts

If older screens still use hardcoded Tailwind colors (`bg-slate-950`, `text-teal-400`, `border-slate-800`, `font-['Instrument_Serif',serif]`, `text-[11px]`, etc.), run the migration scripts:

```bash
bash scripts/migrate-tokens.sh       # colors, borders, backgrounds
bash scripts/migrate-typography.sh   # font arrays, arbitrary text sizes, arbitrary leading
git diff --stat                       # review
git commit -am "refactor(design-system): migrate hardcoded utilities to tokens"
```

The scripts walk every `.jsx`/`.tsx` under `src/` and sed-rewrite the patterns. They are idempotent — safe to run multiple times.
