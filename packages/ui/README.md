# 🎨 Shared UI Library (`@repo/ui`)

[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math%20Formatting-3298dc)](https://katex.org/)

The `@repo/ui` package contains the shared React 19 component library used across `apps/web` and `apps/testhub`. It provides accessible, styled UI primitives and specialized educational widgets such as floating AI study assistants, LaTeX math tokenizers, and custom loaders.

---

## 🧩 Components Catalog

| Component | Path | Description |
| :--- | :--- | :--- |
| `Button` | `@repo/ui/button` | Accessible button with `solid` and `outline` variants. |
| `Card` | `@repo/ui/card` | Structured container card for lists and content groups. |
| `Code` | `@repo/ui/code` | Monospace code snippet container. |
| `FloatingChatbot` | `@repo/ui/floating-chatbot` | Draggable/expandable AI study assistant with page-jumping citations and message history. |
| `GraduationCapLoader` | `@repo/ui/graduation-cap-loader` | Educational animated graduation cap loading indicator. |
| `MathText` | `@repo/ui/math-text` | Native KaTeX parser supporting inline (`$...$`, `\(...\)`), display (`$$...$$`, `\[...\]`), markdown images, and clickable `[Page X]` citations. |
| `SelectionBox` | `@repo/ui/SelectionBox` | Dynamic multi-select box with keyboard navigation and search filter. |

---

## 📦 Usage Examples

### 1. Rendering Mathematical Expressions (`MathText`)

```tsx
import { MathText } from "@repo/ui/math-text";

export function QuestionCard({ text }: { text: string }) {
  return (
    <div className="p-4 rounded-lg bg-white shadow-sm">
      <MathText
        text="Calculate the integral: $$\int_{0}^{\pi} \sin(x) dx$$ [Page 42]"
        onJumpToPage={(page) => console.log("Jumping to page:", page)}
      />
    </div>
  );
}
```

### 2. Floating AI Study Assistant (`FloatingChatbot`)

```tsx
import { FloatingChatbot } from "@repo/ui/floating-chatbot";

export function StudyPage({ chapterId, pageNum }: { chapterId: number; pageNum: number }) {
  return (
    <div>
      {/* Chapter Reader Content */}
      <FloatingChatbot
        chapterId={chapterId}
        currentPage={pageNum}
        title="Physics AI Tutor"
        subtitle="Ask questions with page-level citations"
        apiEndpoint="/api/chat"
        onJumpToPage={(p) => window.scrollToPage(p)}
      />
    </div>
  );
}
```

---

## 🛠️ Development & Linting

```bash
# Check TypeScript types
cd packages/ui && npm run check-types

# Run ESLint validation
cd packages/ui && npm run lint
```

