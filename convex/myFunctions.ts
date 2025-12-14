import { v } from 'convex/values'
import { query } from './_generated/server'

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// Example query function:
export const exampleQuery = query({
  args: {},
  returns: v.object({
    message: v.string(),
  }),
  handler: async (ctx) => {
    return {
      message: 'Hello from Convex!',
    }
  },
})
