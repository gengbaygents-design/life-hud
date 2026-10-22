import { emailService } from '@ship/emails';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import config from '@/config';
import { rawDb, databaseSchema } from '@/db';

export const auth = betterAuth({
  appName: 'LIFE HUD',
  telemetry: { enabled: false },
  rateLimit: { enabled: true },
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.API_URL,
  basePath: '/api/auth',
  trustedOrigins: [config.WEB_URL],

  database: drizzleAdapter(rawDb, {
    provider: 'pg',
    schema: databaseSchema,
    usePlural: true,
    transaction: true,
  }),

  user: {
    fields: {
      name: 'fullName',
      image: 'avatarUrl',
      emailVerified: 'isEmailVerified',
    },
  },

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await emailService.sendTemplate({
        to: user.email,
        subject: 'LIFE HUD · 重置密码',
        template: 'reset-password',
        params: {
          name: user.name,
          href: url,
        },
      });
    },
  },

  emailVerification: {
    sendOnSignUp: false,
    sendVerificationEmail: async ({ user, url }) => {
      await emailService.sendTemplate({
        to: user.email,
        subject: 'LIFE HUD · 确认邮箱',
        template: 'verify-email',
        params: {
          name: user.name,
          href: url,
        },
      });
    },
  },

  session: {
    cookieCache: {
      enabled: false,
      maxAge: 60 * 5,
    },
  },
});

export type Auth = typeof auth;
