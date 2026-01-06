import type { AuthConfig } from 'convex/server'

/**
 * Clerk → Convex authentication.
 *
 * Create a Clerk JWT template with audience "convex" and set:
 * - CLERK_JWT_ISSUER_DOMAIN in your Convex env
 * - VITE_CLERK_JWT_TEMPLATE (optional, defaults to "convex") in your app env
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig

