# ⚙️ Shared TypeScript Configs (`@repo/typescript-config`)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue?logo=typescript)](https://www.typescriptlang.org/)

Shared, modular `tsconfig.json` bases across the StudyHub monorepo to ensure consistent strict type-checking, JSX resolution, and path aliases.

---

## 📦 Presets

### 1. `base.json`
- Base strict TypeScript configuration for Node.js scripts and libraries.
- ESNext module targeting with NodeNext resolution.

### 2. `nextjs.json`
- Next.js 16 App Router configuration with Next.js plugin integration.
- Configured for React 19 JSX transformation (`react-jsx`).

### 3. `react-library.json`
- Preset for shared React component libraries (`@repo/ui`).
- DOM library inclusion and strict component typing.

---

## 🛠️ Usage in `tsconfig.json`

```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "baseUrl": "."
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

