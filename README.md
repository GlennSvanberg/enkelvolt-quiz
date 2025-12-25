# Enkelvolt

A simple Kahoot-style quiz application. Create quizzes, share links or QR codes, and let participants join without any sign-up required.

## Features

- **Quiz creation/editing (admin)**: Login required (Clerk)
- **Public Participation**: Anyone can join quizzes via URL or QR code - no login needed
- **Real-time Updates**: Live quiz sessions with real-time participant responses
- **Simple & Focused**: No extra features, just core quiz functionality

## Tech Stack

- **TanStack Start**: Full-stack React framework with file-based routing
- **Clerk**: Authentication (Google sign-in)
- **Convex**: Backend database and real-time serverless functions
- **Tailwind CSS**: Styling
- **Vite**: Build tool and dev server

## Getting Started

### Prerequisites

- Node.js installed
- Convex account (created during setup)
- Clerk application (for Google sign-in)

### Setup

1. **Install dependencies:**

```bash
npm install
```

2. **Configure Clerk (Google sign-in):**
- Enable Google as a sign-in method in the Clerk dashboard.
- Create a **JWT template** named `convex` with **audience** set to `convex`.

3. **Set up environment variables:**
- Create `.env.local` (see `.env.example`).
- Set Convex env vars (via Convex CLI/dashboard):
  - `CLERK_JWT_ISSUER_DOMAIN` (the issuer domain for the Clerk JWT template)

4. **Set up Convex:**

```bash
npx convex dev
```

5. **Start the app:**

```bash
npm run dev
```

6. **Open the app:**
Visit `http://localhost:3000`

## Development

- **Frontend routes**: `src/routes/` (file-based routing)
- **Backend functions**: `convex/` (Convex queries and mutations)
- **Components**: `src/components/`
- **Styling**: Tailwind CSS

## Auth behavior (important)

- **Playing**: always public (no account required).
- **Creating/editing**: requires sign-in.
- **Editing**: you can only edit quizzes where `ownerId === Clerk userId`.

## Learn More

- [TanStack Start Docs](https://tanstack.com/start)
- [Clerk Docs](https://clerk.com/docs)
- [Convex Docs](https://docs.convex.dev)
