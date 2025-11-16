# MindChunk API

A modern, interactive learning platform designed to help users efficiently learn and retain knowledge through chunked content, spaced repetition, and gamified study sessions.

## Overview

MindChunk is a full-stack web application that combines smart content organization with engaging study tools. Users can upload learning materials, break them into manageable chunks, complete interactive quizzes, track their learning streaks, and earn achievements—all within a sleek, intuitive interface.

## Key Features

- **Content Upload & Processing**: Upload learning materials that are automatically processed and organized into digestible chunks
- **Chunk Viewer**: Browse and review organized learning content with an intuitive interface
- **Interactive Quizzes**: Test your knowledge with quiz cards generated from your content
- **Focus Timer**: Stay focused with an integrated Pomodoro-style focus timer
- **Streak Counter**: Maintain and track your study streaks to build consistent learning habits
- **Achievement Badges**: Earn badges and track progress as you complete milestones
- **Statistics Dashboard**: Monitor your learning progress with comprehensive stats and analytics
- **User Authentication**: Secure login and personalized learning experience via Supabase

## Tech Stack

### Frontend
- **React** - Modern UI framework with TypeScript for type safety
- **Vite** - Lightning-fast build tool and dev server
- **TypeScript** - Strongly typed JavaScript for better code quality
- **Tailwind CSS** - Utility-first CSS framework for responsive design
- **shadcn-ui** - High-quality, accessible React components

### Backend
- **Supabase** - PostgreSQL database and authentication
- **Edge Functions** - Serverless functions for content processing
- **PostgREST** - Automatic REST API generation

### Tooling
- **ESLint** - Code quality and consistency
- **PostCSS** - CSS transformations
- **Bun** - Fast JavaScript runtime (package manager/bundler support)

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or Bun package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd mindchunk-api

# Install dependencies
npm install
# or with Bun
bun install
```

### Development

```bash
# Start the development server (Vite with hot reload)
npm run dev
# or with Bun
bun run dev
```

The application will be available at `http://localhost:5173` with hot module reloading enabled.

### Build for Production

```bash
npm run build
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn-ui component library
│   ├── AchievementBadge.tsx
│   ├── ChunkViewer.tsx
│   ├── FocusTimer.tsx
│   ├── QuizCard.tsx
│   └── ...
├── pages/              # Page components (Auth, Dashboard, Study, etc.)
├── hooks/              # Custom React hooks
├── integrations/       # Third-party integrations (Supabase)
├── lib/                # Utility functions and helpers
└── main.tsx            # Application entry point

supabase/
├── functions/          # Edge functions for content processing
│   ├── process-content/
│   └── process-upload/
└── migrations/         # Database schema migrations
```

## Usage

### For Users
1. **Sign Up/Login**: Create an account or log in with existing credentials
2. **Upload Content**: Upload study materials (documents, notes, etc.)
3. **Review Chunks**: Browse auto-organized content chunks
4. **Take Quizzes**: Test your knowledge with interactive quizzes
5. **Track Progress**: Monitor your streak, stats, and earned achievements
6. **Study Sessions**: Use the focus timer to maintain productive study sessions

### For Developers
- Components are organized in `/src/components` with clear separation of concerns
- UI components leverage shadcn-ui for consistency and accessibility
- Supabase integration is in `/src/integrations/supabase`
- Backend logic runs on Supabase Edge Functions for scalability
- Database schema is version-controlled in migrations

## Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Contributing

Contributions are welcome! Please ensure:
- Code follows ESLint standards
- TypeScript types are properly defined
- Components are documented
- Tests pass before submitting PRs

## License

This project is licensed under the MIT License.
