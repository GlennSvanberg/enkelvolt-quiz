# Enkelvolt - Tech Stack Overview

**Enkelvolt** is a simple Kahoot-style quiz app. It's a URL-based quiz application where:

- **Admins** need to login (via Clerk) to create and manage quizzes
- **Participants** can join quizzes without authentication by simply visiting a URL or scanning a QR code
- No extra complexity - just simple, straightforward quiz functionality

This project uses **TanStack Start**, **Clerk**, and **Convex** for a modern full-stack React application.

## Tech Stack

- **TanStack Start**: Full-stack React framework with file-based routing (`src/routes/`)
- **Clerk**: Authentication (Google sign-in)
- **Convex**: Backend database and serverless functions (`convex/`)
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Styling (prefer shadcn/ui components when possible)

## Key Setup Details

### TanStack Start

- File-based routing in `src/routes/`
- Server loaders for data fetching (`loader` functions)
- Uses `@tanstack/react-router` and `@tanstack/react-start`

### Clerk

- Environment variables in `.env.local`:
  - `VITE_CLERK_PUBLISHABLE_KEY`
  - `VITE_CLERK_JWT_TEMPLATE` (optional, default `convex`)
- Sign-in page: `src/routes/sign-in.tsx`
- Route access:
  - public: playing/hosting sessions, viewing quizzes
  - protected by UI + server enforcement: creating/editing quizzes

### Convex

- Functions in `convex/` directory
- Auth setup: `convex/auth.config.ts` (Clerk JWT issuer configuration)
- Convex env variables:
  - `CLERK_JWT_ISSUER_DOMAIN`
- Convex URL: `VITE_CONVEX_URL` in `.env.local` (auto-added by `npx convex dev`)
- Client provider: `ClerkProvider` + `ConvexProvider` wired in `src/router.tsx`

## Important Notes

- **PowerShell**: Use `;` instead of `&&` for command chaining
- **Port**: Default dev server runs on `http://localhost:3000`
- **Docs**: Use Context7 to get latest documentation for TanStack Start, Clerk, and Convex

## Common Commands

```powershell
# Start dev server (frontend + backend)
npm run dev

# Convex commands
npx convex dev
npx convex env set CLERK_JWT_ISSUER_DOMAIN <your-clerk-jwt-issuer-domain>

# Build
npm run build
```

## Project Structure

```javascript
src/
  routes/          # TanStack Start file-based routes
  components/      # React components
  lib/             # Auth client and server utilities
  start.ts         # TanStack Start config
convex/
  auth.config.ts   # Convex auth provider configuration (Clerk)
  schema.ts        # Convex schema
  quizzes.ts       # Convex queries/mutations
.env.local        # Environment variables (not committed)
```
