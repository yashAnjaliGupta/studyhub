# 🔍 Shared ESLint Configuration (`@repo/eslint-config`)

[![ESLint](https://img.shields.io/badge/ESLint-v9-4B32C3?logo=eslint)](https://eslint.org/)
[![TypeScript](https://img.shields.io/badge/typescript--eslint-v8-blue)](https://typescript-eslint.io/)
[![Prettier](https://img.shields.io/badge/Prettier-Compatible-F7B93E?logo=prettier)](https://prettier.io/)

Shared, modular ESLint 9 Flat Config presets used across all apps and packages in the StudyHub monorepo.

---

## 📦 Presets Available

### 1. `@repo/eslint-config/base`
- Base TypeScript and JavaScript linting rules.
- Prettier conflict suppression (`eslint-config-prettier`).
- Strict unused variable detection and TypeScript type conventions.

### 2. `@repo/eslint-config/next-js`
- Standard Next.js linting configuration (`@next/eslint-plugin-next`).
- Configured for React 19 and Next.js 16 App Router.

### 3. `@repo/eslint-config/react-internal`
- Tailored for internal React libraries (`@repo/ui`).
- Hooks rules (`eslint-plugin-react-hooks`) and JSX transform compatibility.

---

## 🛠️ Usage in `eslint.config.mjs`

```javascript
import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config} */
export default nextJsConfig;
```
