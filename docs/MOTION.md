# Motion — the permitted animation list

The rebuild's motion contract. Motion explains, never decorates. If an animation
doesn't show where something came from or went, it isn't here. One vocabulary,
defined in `src/components/motion/transitions.ts`, used everywhere — a bespoke
per-screen animation is a bug.

## Rules

1. **Only `transform` and `opacity` animate.** Animating `width`, `height`,
   `top`, `filter`, `box-shadow`, or `background-position` is a defect.
2. **Fast in, calm out.** Entrances ≤ 200ms. Nothing the user waits on exceeds
   250ms. **No ambient loops** (the aurora is static).
3. **Interactive motion is gesture-tracked 1:1 and interruptible** (sheet drag,
   edge-swipe-back). An uninterruptible spring is worse than no spring.
4. **Never animate a number the user is trying to read.** Values are readable at
   first paint; only `NumberTicker` animates, and only when a value *changes*
   while on screen.
5. **Stagger ≤ 3 items at 20ms**, then everything lands together.
6. **`prefers-reduced-motion` → instant state change**, never a slow crossfade.

## The vocabulary (`transitions.ts`)

| Token | Value | Used for |
|---|---|---|
| `easeMicro` | 150ms ease-out | hovers, toggles, icon tints |
| `easeStandard` | 250ms `cubic-bezier(0.32,0.72,0,1)` | color, small layout shifts |
| `springSnappy` | spring 420/30 | press feedback (`Pressable` whileTap 0.97) |
| `springSmooth` | spring 260/26 | sheet open + drag (interruptible) |
| entrance | 180ms, `y:8→0` + fade, ≤3-item 20ms stagger | list/grid mount (`Stagger`) |
| route transition | 140ms opacity crossfade | `app/template.tsx` |

## Permitted animations (the whole list)

- **Press**: `whileTap` scale 0.97 (`Pressable`, buttons via CSS `active:`).
- **Sheet**: spring-up + 1:1 drag-to-dismiss with velocity (`Sheet`).
- **Edge-swipe-back**: 1:1 finger-tracked route pop (`EdgeSwipeBack`).
- **NumberTicker**: digit roll on *change* only.
- **List/grid entrance**: 180ms fade-up, ≤3 staggered (`Stagger`).
- **Route change**: 140ms crossfade (`template.tsx`).
- **Skeleton shimmer**: the one ambient exception, and only while data is loading.
- **Pull-to-refresh**: the indicator translate/rotate while dragging.

## Explicitly removed

- Count-up hero numerals on mount (animated a number being read).
- The 60–90s aurora drift loop (a never-ending full-viewport paint).
- The app-shell scale + brightness on sheet-open (re-rasterized every blur).
- Long 8-item / 40ms stagger cascades and the entrance `scale`/`y:16` rise.
