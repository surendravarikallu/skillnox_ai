# AI-Powered Interview & Resume Screening Platform

## Overview

This is a comprehensive AI-driven interview preparation and evaluation platform designed for 3rd and 4th year students. The system provides mock interviews (technical, HR, behavioral, company-specific, group discussions, and project explanations), resume analysis with skill extraction, personality assessments, and placement probability predictions.

The platform features two main portals:
- **Student Portal**: For interview practice, resume management, personality insights, and placement predictions
- **Admin Portal**: For monitoring student progress, analytics, and system-wide reports

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18+ with TypeScript running on Vite for fast development and optimized production builds.

**UI Component System**: 
- Utilizes shadcn/ui components built on Radix UI primitives
- Material Design 3 principles with Linear-inspired aesthetics for clean, professional appearance
- Comprehensive component library including dialogs, dropdowns, forms, cards, tables, charts, and navigation elements
- Custom theme system with CSS variables for light/dark mode support

**Styling**:
- Tailwind CSS for utility-first styling with custom configuration
- Typography: Inter font family for UI/body text, JetBrains Mono for technical content
- Color system based on HSL values with alpha channel support for theme flexibility
- Responsive design with mobile-first approach

**State Management**:
- TanStack Query (React Query) for server state management, caching, and API synchronization
- Custom hooks pattern for authentication (`useAuth`), mobile detection (`useIsMobile`), and toast notifications (`useToast`)

**Routing**:
- Wouter for lightweight client-side routing
- Route protection based on authentication state
- Separate route structures for student and admin portals

**Key Pages**:
- Landing page for unauthenticated users
- Dashboard with performance metrics and quick actions
- Interview start/room/results flow for conducting and reviewing interviews
- Resume upload and job description management
- Personality assessment visualization
- Placement probability predictions
- Admin analytics and student management

### Backend Architecture

**Runtime**: Node.js with Express framework using TypeScript.

**API Design**:
- RESTful API endpoints organized by resource type
- Session-based authentication via Replit Auth (OpenID Connect)
- File upload handling via Multer middleware with memory storage
- Rate limiting and security middleware
- JSON request/response format with comprehensive error handling

**Authentication & Authorization**:
- Replit Auth integration using OpenID Client and Passport strategies
- Session management with PostgreSQL session store (connect-pg-simple)
- Role-based access control (student vs admin roles)
- Automatic user provisioning via OAuth flow

**API Endpoints Structure**:
- `/api/auth/*` - Authentication and user management
- `/api/resume/*` - Resume upload, parsing, and analysis
- `/api/job-descriptions/*` - Job description CRUD operations
- `/api/interviews/*` - Interview session management and question delivery
- `/api/personality/*` - Personality assessment data
- `/api/placement/*` - Placement probability calculations
- `/api/admin/*` - Administrative analytics and user management

**Interview System**:
- Pre-defined question banks for different interview types (technical, HR, behavioral, project-based)
- Support for company-specific interviews with customizable question sets
- Real-time interview room functionality with question progression
- Answer evaluation and scoring system
- Emotion and voice analysis integration points

### Data Storage

**Database**: PostgreSQL via Neon serverless driver.

**ORM**: Drizzle ORM for type-safe database operations.

**Schema Design**:
- `users` - User profiles with role differentiation, demographics, and interview counts
- `sessions` - Secure session storage for authentication persistence
- `resumes` - Parsed resume data including skills, experience, education, and AI-generated scores
- `jobDescriptions` - Job postings with required skills and descriptions
- `interviews` - Interview sessions with type, status, company, scores, and timestamps
- `interviewQuestions` - Question-answer pairs linked to interviews with individual scoring
- `personalityAssessments` - Personality dimension scores and traits
- `placementProbabilities` - Time-based placement predictions (30/60/90 days)
- `gdSessions` - Group discussion data with leadership and communication metrics
- `systemLogs` - Audit trail for administrative actions

**Enums**:
- User roles: student, admin
- Interview types: technical, hr, behavioral, company, gd, project
- Interview status: pending, in_progress, completed, cancelled
- Gender: male, female
- Personality dimensions: introvert/extrovert, thinker/feeler, logical/creative, planner/spontaneous

**Indexing Strategy**: Session expiration index for efficient cleanup.

### External Dependencies

**UI & Component Libraries**:
- Radix UI primitives (@radix-ui/react-*) for accessible, unstyled component foundations
- shadcn/ui component patterns for consistent design system
- TanStack Query for data fetching and caching
- React Hook Form with Zod resolvers for form validation
- Lucide React for icon library
- cmdk for command palette functionality

**Database & ORM**:
- Neon serverless PostgreSQL (@neondatabase/serverless) with WebSocket support
- Drizzle ORM for schema definition and type-safe queries
- Drizzle Kit for migrations

**Authentication**:
- OpenID Client for OAuth/OIDC flows
- Passport.js with custom strategies
- Express Session with PostgreSQL store

**File Processing**:
- Multer for multipart form handling (resume uploads)
- File size limits: 5MB maximum

**Build & Development Tools**:
- Vite for frontend bundling with HMR
- esbuild for server-side bundling
- TypeScript for type safety across stack
- ESM module format throughout

**Styling**:
- Tailwind CSS with PostCSS and Autoprefixer
- class-variance-authority for component variant management
- tailwind-merge and clsx for conditional class handling

**Utilities**:
- date-fns for date manipulation
- nanoid for unique ID generation
- zod for schema validation
- ws (WebSocket) for Neon database connections

**Replit-Specific**:
- @replit/vite-plugin-runtime-error-modal for error overlay
- @replit/vite-plugin-cartographer for code navigation
- @replit/vite-plugin-dev-banner for development indicators

**Future AI Integration Points**:
- Resume parsing and skill extraction
- Interview answer evaluation
- Emotion detection from video
- Voice analysis for confidence metrics
- Personality trait calculation
- Placement probability prediction algorithms
- Group discussion evaluation

**Design System**:
- Companies supported: TCS, Infosys, Wipro, Accenture, Cognizant, Capgemini, Amazon, HCL, Tech Mahindra, IBM
- Custom color palette with support for light/dark themes
- Elevation system with shadow variants
- Consistent spacing and typography scale