# Enkelvolt - Tech Stack Overview

**Enkelvolt** is a simple Kahoot-style quiz app. It's a URL-based quiz application where:

- **Admins** need to login (via Better Auth) to create and manage quizzes
- **Participants** can join quizzes without authentication by simply visiting a URL or scanning a QR code
- No extra complexity - just simple, straightforward quiz functionality

This project uses **TanStack Start**, **Better Auth**, and **Convex** for a modern full-stack React application.

## Tech Stack

- **TanStack Start**: Full-stack React framework with file-based routing (`src/routes/`)
- **Better Auth**: Authentication with email/password sign-in/sign-up
- **Convex**: Backend database and serverless functions (`convex/`)
- **Vite**: Build tool and dev server
- **Tailwind\# UI
C- Always use Shadcn/ui components when possible - use mcp tools to find relevant components

SS**: Styling
-

## Key Setup Details

### TanStack Start

- File-based routing in `src/routes/`
- Server loaders for data fetching (`loader` functions)
- Uses `@tanstack/react-router` and `@tanstack/react-start`

### Better Auth

- Environment variables required in `.env.local`:
  - `SITE_URL` (e.g., `http://localhost:3000`)
- Client hooks: `useSession()` from `better-auth/react` via `authClient`
- Server functions: `getAuth()`, `getSession()` from `src/lib/auth-server`
- Auth API route: `src/routes/api/auth/$` (catch-all route)
- Sign-in/sign-up pages: `src/routes/sign-in.tsx` and `src/routes/sign-up.tsx`
- Client setup: `src/lib/auth-client.ts` exports `authClient`

### Convex

- Functions in `convex/` directory
- Auth setup: `convex/auth.ts` (Better Auth configuration with Convex integration)
- Better Auth component: Added to `convex/schema.ts` via `defineComponent(betterAuth)`
- Environment variable: `SITE_URL` set via `npx convex env set SITE_URL <url>`
- Convex URL: `VITE_CONVEX_URL` in `.env.local` (auto-added by `npx convex dev`)
- Client provider: `ConvexClientProvider` wraps app with `ConvexBetterAuthProvider`

## Important Notes

- **PowerShell**: Use `;` instead of `&&` for command chaining
- **Port**: Default dev server runs on `http://localhost:3000`
- **Docs**: Use Context7 to get latest documentation for TanStack Start, Better Auth, and Convex

## Common Commands

```powershell
# Start dev server (frontend + backend)
npm run dev

# Convex commands
npx convex dev
npx convex env set SITE_URL http://localhost:3000

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
  auth.ts          # Better Auth configuration
  schema.ts        # Convex schema with Better Auth component
  quizzes.ts       # Convex queries/mutations
.env.local        # Environment variables (not committed)
```
