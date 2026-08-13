# UI/UX Design System & Aesthetics Guidelines

## Overview

Skilnox AI follows modern design principles inspired by Material Design 3 and Linear's dark UI aesthetic. The interface is engineered to feel responsive, professional, dynamic, and visually striking.

---

## Design System Tokens & Color Palette

The interface uses dynamic HSL CSS variable tokens configured in `client/src/index.css` and `tailwind.config.ts`.

### Dark Palette Palette Tokens

```css
:root {
  --background: 222.2 84% 4.9%;        /* Dark Slate Canvas (#090D16) */
  --foreground: 210 40% 98%;           /* Bright White Text */
  --card: 222.2 84% 6.9%;             /* Surface Elevation 1 */
  --card-foreground: 210 40% 98%;
  --primary: 238.7 83.5% 66.7%;        /* Indigo Core Accent (#6366F1) */
  --primary-foreground: 210 40% 98%;
  --secondary: 217.2 32.6% 17.5%;      /* Dark Slate Border Accent */
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;          /* Muted Card Background */
  --muted-foreground: 215 20.2% 65.1%; /* Secondary Description Text */
  --accent: 160 84% 39%;               /* Emerald Success Accent (#10B981) */
  --destructive: 346.8 77.2% 49.8%;    /* Rose Alert / Warning (#F43F5E) */
  --border: 217.2 32.6% 17.5%;
  --radius: 0.75rem;
}
```

---

## Typography

- **Primary Font Family**: Outfit / Geist Sans (`@fontsource/outfit`) for clean UI headings, labels, and copy.
- **Monospace Font Family**: JetBrains Mono for code blocks, AI prompt logs, and numerical metrics.

```css
body {
  font-family: 'Outfit', sans-serif;
  -webkit-font-smoothing: antialiased;
}

code, kbd, samp {
  font-family: 'JetBrains Mono', monospace;
}
```

---

## Key Interface Layouts

### 1. Live Interview Screen
- **Dual-Pane Split**:
  - **Left Pane**: Live webcam feed with facial emotion overlay bounding boxes and real-time audio volume meter.
  - **Right Pane**: Interactive question card, speech-to-text transcript feed, progress timeline, and action controls.
- **Glassmorphism Overlay**: Subtle backdrop blur (`backdrop-blur-md bg-slate-900/60`) for control floating bars.

### 2. Admin Control Portal
- Grid layout showing active slots, candidate roster cards, completion percentages, and skill gap charts powered by Recharts.

### 3. Student Dashboard
- Metric summary cards (Placement Probability, Resume ATS Score, Total Mock Interviews Taken) with smooth hover micro-animations powered by Framer Motion.

---

## Interaction & Animation Standards

- **Transitions**: All interactive buttons, inputs, and links must use smooth transitions (`transition-all duration-200 ease-in-out`).
- **Micro-Animations**: Framer Motion `<motion.div>` scale and fade entrance effects on dialog modals, score updates, and tab switches.
- **Accessibility**: All interactive elements include unique `id` attributes and accessible Radix UI primitives with full keyboard navigation support.
