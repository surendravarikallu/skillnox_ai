# Design Guidelines: AI Interview & Resume Screening Platform

## Design Approach
**Design System Foundation**: Material Design 3 principles with Linear-inspired refinement for clean, professional aesthetic. This platform requires credibility, clarity, and efficiency for both assessment and learning contexts.

## Typography System
**Font Families**:
- Primary: Inter (400, 500, 600) - UI elements, body text
- Display: Inter (600, 700) - Headers, section titles
- Code/Data: JetBrains Mono (400, 500) - Technical content, code snippets

**Hierarchy**:
- Hero Headers: text-5xl font-bold
- Page Titles: text-3xl font-semibold
- Section Headers: text-xl font-semibold
- Card Titles: text-lg font-medium
- Body: text-base font-normal
- Small Labels: text-sm font-medium
- Captions/Metadata: text-xs

## Layout System
**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-16
- Card gaps: gap-6
- Element margins: mb-4, mb-6, mb-8

**Grid System**:
- Dashboard cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Analytics: grid-cols-1 lg:grid-cols-4 for stat cards
- Admin tables: Full-width with responsive scrolling
- Forms: max-w-2xl centered for optimal reading

## Component Library

### Navigation
**Student Portal Header**:
- Fixed top navigation with logo left, user avatar/dropdown right
- Navigation links: Dashboard, Interviews, Resume, Reports, Settings
- Notification bell icon with badge indicator
- Clean horizontal layout with subtle bottom border

**Admin Portal Sidebar**:
- Left sidebar (w-64) with expandable navigation
- Categories: Overview, Students, Analytics, JD Management, Reports, Settings
- Active state with vertical accent indicator
- Collapsible on mobile to hamburger menu

### Dashboard Cards
**Score Cards**:
- Rounded-lg borders with subtle shadows (shadow-sm)
- Icon top-left, score/metric prominent center-right
- Trend indicator (up/down arrow) with percentage
- 4-card grid for key metrics (Technical, HR, GD, Overall)

**Performance Graphs**:
- Full-width chart containers with p-6 padding
- Chart.js integration for line/bar/radar charts
- Legend placement bottom-center
- Axis labels in text-sm
- Responsive height (h-64 to h-80)

### Interview Interface
**Active Interview Layout**:
- Split screen: Webcam feed left (40%), Questions/Responses right (60%)
- Webcam: Rounded-xl container with border, aspect-video
- Recording indicator: Pulsing dot top-right of webcam
- Question area: Large text-xl question, timer below
- Response area: Multiline textarea or voice visualizer
- Control bar bottom: Record, Stop, Skip, End buttons with icons

**Avatar Display**:
- Animated avatar illustration (male/female based on logic)
- Positioned in dedicated card above question area
- Subtle animation when "listening" or "speaking"

### Resume & JD Upload
**Upload Zone**:
- Dashed border drag-drop area (h-48)
- Center-aligned upload icon and text
- File preview cards after upload showing filename, size
- Parse button prominently placed
- Results displayed in expandable sections below

### Personality & Reports
**Personality Type Card**:
- Large badge-style indicators for each dimension
- Visual spectrum slider showing position (Introvert ←→ Extrovert)
- Description text below each dimension
- Overall personality summary card at top

**Placement Probability**:
- Large circular progress indicator showing primary percentage
- Three time-period cards (30/60/90 days) in horizontal row
- Each with percentage and confidence indicator
- Insights list below with improvement suggestions

### Admin Analytics
**Student Table**:
- Sortable columns: Name, Batch, Technical Score, HR Score, GD Score, Placement Probability
- Row hover states for interactivity
- Action buttons (View, Edit, Export) right-aligned
- Pagination controls bottom-center
- Search and filter bar above table

**Skill Gap Matrix**:
- Heatmap-style visualization using grid layout
- Skills on Y-axis, Students on X-axis
- Intensity indicates proficiency level
- Interactive tooltips on hover

### Forms & Inputs
**Consistent Input Style**:
- Rounded-md borders
- Focus ring with offset
- Label above input (text-sm font-medium mb-2)
- Helper text below in text-xs
- Error states with red accent and icon
- Grouped related inputs with gap-4

### Buttons
**Primary Actions**: Solid fill, rounded-md, px-6 py-3
**Secondary Actions**: Outlined, same dimensions
**Danger Actions**: Red variant for delete/end operations
**Icon Buttons**: Square (h-10 w-10) for compact actions

## Images
**Hero Section**: Large split-screen hero on landing/login page
- Left side: Professional illustration of interview/resume screening scenario
- Right side: Login/register form or value proposition
- Height: min-h-screen with centered content

**Dashboard Illustrations**: Small spot illustrations for empty states
- Empty resume state: Upload illustration
- No interviews yet: Preparation illustration
- Completed interviews: Success/trophy illustration

**Avatar Images**: Gender-based interviewer avatars (professional illustrations, not photos) positioned in interview interface cards

## Animations
**Minimal & Purposeful**:
- Loading spinners for AI processing
- Progress bars for interview completion
- Subtle fade-in for score reveals
- Pulse animation for recording indicator
- No decorative scroll animations

## Accessibility
- All interactive elements have focus states
- Webcam/audio controls have clear labels
- Score visualizations include text alternatives
- Form inputs have associated labels
- Sufficient touch target sizes (min-h-11)