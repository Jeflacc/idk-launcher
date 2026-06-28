import { z } from 'zod';

export const AuthSchema = {
  microsoftAccount: z.object({
    provider: z.literal('microsoft'),
    username: z.string(),
    uuid: z.string(),
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresAt: z.number(),
    profile: z
      .object({
        skins: z.array(z.object({ id: z.string(), url: z.string(), variant: z.string().optional() })).optional(),
        capes: z.array(z.object({ id: z.string(), url: z.string() })).optional(),
      })
      .optional(),
  }),

  elybyAccount: z.object({
    provider: z.literal('elyby'),
    username: z.string(),
    uuid: z.string(),
    accessToken: z.string(),
    refreshToken: z.string().optional(),
    expiresAt: z.number(),
  }),

  session: z.discriminatedUnion('provider', [
    z.object({
      provider: z.literal('microsoft'),
      username: z.string(),
      uuid: z.string(),
      // NOTE: tokens are NEVER sent to the renderer in the v2 architecture.
      // The renderer only knows whether a session exists + the public profile.
      profile: z.object({}).passthrough().optional(),
    }),
    z.object({
      provider: z.literal('elyby'),
      username: z.string(),
      uuid: z.string(),
    }),
  ]),

  microsoftAuthRequest: z.object({
    /** Whether to use the interactive popup (true) or device code (false). */
    interactive: z.boolean().default(true),
  }),

  elybyAuthRequest: z.object({
    username: z.string().min(3),
    password: z.string().min(1),
  }),

  fetchElybyProfileRequest: z.object({
    username: z.string().min(3),
  }),
} as const;
