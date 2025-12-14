# Enkelvolt

A simple Kahoot-style quiz application. Create quizzes, share links or QR codes, and let participants join without any sign-up required.

## Features

- **Admin Dashboard**: Login required for quiz creators/admins
- **Public Participation**: Anyone can join quizzes via URL or QR code - no login needed
- **Real-time Updates**: Live quiz sessions with real-time participant responses
- **Simple & Focused**: No extra features, just core quiz functionality

## Tech Stack

- **TanStack Start**: Full-stack React framework with file-based routing
- **Convex**: Backend database and real-time serverleemail/password)
- **Tailwind CSS**: Styling
- **Vite**: Build tool and dev server

## Getting Started

### Prerequisites

- Node.js installed
- Convex account (created during setup)

### Setup

1. **Install dependencies:**
2. **Set up environment variables:**
   Create a `.env.local` file with:
3. **Set up Convex:**&#x54;his will:
   - Create your Convex deployment
   - Add `VITE_CONVEX_URL` to `.env.local`
   - Open the Convex dashboard
   Then set the site URL in Convex:
4. **Start development server:**&#x54;his starts both the frontend (TanStack Start) and Convex backend.
5. **Open the app:**
   Visit <http://localhost:3000>

## Development

- **Frontend routes**: `src/routes/` (file-based routing)
- **Backend functions**: `convex/` (Convex queries and mutations)
- **Components**: `src/components/`
- **Styling**: Tailwind CSS

## Project Structure

```javascript
src/
  routes/          # TanStack Start routes
  componentsC # React components
  lib/             # Auth client and server utilities

  auth.ts          # Better Auth coa.ts        # Convex schema with Better Auth component
  quizzes.ts       # Backend functions
.env.local        authentication required - just visit the quiz URL

## Learn More

- [TanStack Start Docs](https://tansx.dev/)
- [Better Auth Docs](https://better-auth.com/docs)
