# studio19-template-2026

An opinionated Next.js 16 starter template with React 19, Tailwind CSS v4, shadcn/ui, and a curated set of layout primitives and animation wrappers — ready for building modern web apps.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, React Server Components) |
| UI Components | [shadcn/ui v3](https://ui.shadcn.com) (new-york style) + [Radix UI](https://www.radix-ui.com) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) with CSS variables theming |
| Animations | [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) + [motion/react](https://motion.dev) (Framer Motion) |
| Icons | [Lucide React](https://lucide.dev) |
| Fonts | [Geist Sans & Geist Mono](https://vercel.com/font) via `next/font` |
| Package Manager | [pnpm](https://pnpm.io) |

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
app/                  → Pages, layouts, and global styles (App Router)
components/
  ui/                 → shadcn/ui components (Button, Badge, …)
  layout/             → Layout primitives (Stack, Grid, Cluster, Center, Split, Switcher)
  animations/         → Motion wrappers (FadeIn, SlideInFromTop)
  system/             → Utility components (ProjectVersion)
lib/                  → Shared utilities (cn() class merging helper)
types/                → Shared TypeScript types (BaseComponentProps, PropsWithClassName)
public/               → Static assets
```

## Layout Primitives

Composable layout components that accept `BaseComponentProps` and use `cn()` for class merging.

| Component | Purpose |
| --- | --- |
| `Stack` | Vertical flex column with gap |
| `Grid` | Responsive CSS grid with breakpoint-based column control |
| `Cluster` | Horizontal flex wrap with gap |
| `Center` | Flexbox centering wrapper |
| `Split` | Flex container with `justify-between` |
| `Switcher` | Horizontal flex that wraps, items stretch equally |

```tsx
import { Stack } from "@/components/layout/stack";
import { Grid } from "@/components/layout/grid";

<Stack className="gap-4">
  <Grid sm={1} md={2} lg={3}>
    {/* Responsive grid items */}
  </Grid>
</Stack>
```

## Animation Wrappers

Client components powered by `motion/react` for declarative enter animations.

| Component | Effect |
| --- | --- |
| `FadeIn` | Opacity 0 → 1 |
| `SlideInFromTop` | Slide down + fade + scale |

```tsx
import { FadeIn } from "@/components/animations/fade-in";

<FadeIn>
  <h1>Hello</h1>
</FadeIn>
```

## Adding Components

### shadcn/ui components

```bash
pnpm dlx shadcn@latest add <component-name>
```

Components are installed to `components/ui/` and configured via `components.json` (new-york style, RSC-compatible).

### Custom components

- **Layout primitives** → `components/layout/` — accept `BaseComponentProps`, use `cn()`
- **Animation wrappers** → `components/animations/` — add `"use client"`, use `motion/react`
- **UI components** → `components/ui/` — use `cva` for variants, `cn()` for class merging

## Theming

Colors and radii are defined as CSS custom properties in `app/globals.css` and mapped to Tailwind via `@theme inline`. Dark mode uses the `.dark` class strategy.

Key design tokens include `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--ring`, and `--radius`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Conventions

- **Imports** — always use the `@/` path alias
- **Class merging** — always use `cn()` from `@/lib/utils`
- **Component variants** — use `cva` from `class-variance-authority`
- **Exports** — named exports, not default exports
- **Server Components** — default; only add `"use client"` when interactivity is needed

## License

Private project.
# studio19-template-2026
