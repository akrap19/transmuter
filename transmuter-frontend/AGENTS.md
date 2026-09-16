# Agent Instructions

## Quick Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | Run ESLint |
| `pnpm dlx shadcn@latest add <name>` | Add a shadcn/ui component |

## Architecture

This is a **Next.js 16** project using the **App Router** with **React Server Components** by default.

- **Pages & Layouts**: `app/` directory
- **UI Components**: `components/ui/` (shadcn/ui, new-york style)
- **Layout Primitives**: `components/layout/` (Stack, Grid, Cluster, Center, Split, Switcher)
- **Animations**: `components/animations/` (motion/react wrappers, require "use client")
- **System Components**: `components/system/`
- **Utilities**: `lib/utils.ts` (`cn()` for class merging)
- **Shared Types**: `@/types` (`BaseComponentProps`, `PropsWithClassName`)

## Code Conventions

- **Component Size**: Max 100 rows per file. Break into smaller components if exceeded.
- **Hooks**: Minimize `useEffect` use; prefer derived state, event handlers, or custom hooks.
- **Imports**: Always use `@/` path alias
- **Class merging**: Always use `cn()` from `@/lib/utils`
- **Component variants**: Use `cva` from `class-variance-authority`
- **Exports**: Named exports, not default exports
- **Server Components**: Default; only add `"use client"` when interactivity is needed
- **Styling**: Tailwind CSS v4 utilities; theme via CSS variables in `app/globals.css`

## Adding New Components

### shadcn/ui component

```bash
pnpm dlx shadcn@latest add <component-name>
```

### Layout primitive

Create in `components/layout/`, accept `BaseComponentProps` from `@/types`, use `cn()` for class merging.

### Animation wrapper

Create in `components/animations/`, add `"use client"` directive, use `motion/react`, and re-export from `components/animations/index.tsx`.
