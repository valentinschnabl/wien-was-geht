# WienWasGeht — Frontend PWA

Next.js 16 (React 19) Progressive Web Application providing the interactive map interface, real-time spatial calculations, and event discovery features.

---

## Development

```bash
# Install dependencies
npm install

# Run development server on port 3001
npm run dev

# Run unit & component tests (Vitest)
npm run test

# Production build
npm run build
```

---

## Architecture

- **Rendering**: Static rendering with client-side dynamic hydration for map controls.
- **Mapping**: Leaflet with responsive marker clustering and custom vector pin markers.
- **State Management**: Reactive React state with memoized filtering and zero unnecessary re-renders.
- **Localization**: Pure TypeScript bilingual dictionary (`de` / `en`) with zero external i18n bundle overhead.
- **Styling**: Vanilla CSS design tokens based on Austrian architectural cues (Otto Wagner RAL 6011 Resedagrün).
