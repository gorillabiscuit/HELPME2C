# packages/shared — package-specific CLAUDE.md

Inherits from root `CLAUDE.md`. This file holds rules specific to the shared / cross-platform package.

---

## What this is

Code that runs in both web (Next.js / browser + Node) and mobile (React Native, eventually). Examples:

- TypeScript types for domain entities (Title, User, WatchEntry, Group, etc.)
- Zod schemas for runtime validation
- Pure-function utilities (date formatting, scoring helpers, taxonomy normalisation)
- Hooks that don't touch DOM or RN APIs (e.g. `useDebounce`, `useToggle`)
- API client wiring (tRPC client setup — the SAME setup works on both platforms)

## What this is NOT

- React components (those go in `packages/ui` for web or `packages/mobile-ui` for RN)
- DOM-specific code (`document`, `window` — banned here)
- React Native-specific code (`react-native`, `expo-*` — banned here)
- Node-only APIs (`fs`, `path` — banned here unless behind a platform-detection layer)

## Banned patterns specific to this package (in addition to root §3)

- **No `document`, `window`, or any DOM API.** Will break on RN.
- **No `react-native` imports.** Will break on web.
- **No `node:fs`, `node:path`, etc.** Use Node-environment-only code via injected interfaces, not direct imports.
- **No platform detection without a comment explaining why.** If you must do `if (Platform.OS === 'web')` style branching, wrap it in an interface and let consumers provide the implementation.

## How to add a feature that needs platform-specific behaviour

1. Define an interface or type in `packages/shared`.
2. Provide a default implementation in `packages/shared` IF possible (pure logic).
3. Override per-platform in `apps/web` or `apps/mobile` where that platform's APIs are available.
4. Consumers in `packages/shared` call the interface, never the platform-specific implementation directly.

Example:

```typescript
// packages/shared/storage.ts
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

// apps/web/storage-impl.ts implements KeyValueStore using localStorage
// apps/mobile/storage-impl.ts implements KeyValueStore using Expo SecureStore
// packages/shared imports KeyValueStore from itself, never the impls
```

---

## Testing

- Pure logic: Vitest with no platform setup needed. Tests run anywhere Vitest does.
- Anything that touches an injected platform-interface: mock the interface in tests.
