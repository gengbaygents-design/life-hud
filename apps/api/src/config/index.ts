import process from 'node:process';
import { z } from 'zod';

import configUtil from '@/utils/config.util';

/**
 * Specify your environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
const schema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']),
  IS_DEV: z.preprocess(() => process.env.APP_ENV === 'development', z.boolean()),
  PORT: z.coerce.number().optional().default(3001),
  API_URL: z.url().refine(value => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname), 'Local URL required'),
  WEB_URL: z.url().refine(value => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname), 'Local URL required'),
  DATABASE_URL: z.string(),
  REDIS_URI: z.string().optional(),
  REDIS_ERRORS_POLICY: z.enum(['throw', 'log']).default('log'),
  RESEND_API_KEY: z.string().optional(),
  ADMIN_KEY: z.string().optional(),
  MIXPANEL_API_KEY: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(32),
});

type Config = z.infer<typeof schema>;

const config = configUtil.validateConfig<Config>(schema);

export default config;
