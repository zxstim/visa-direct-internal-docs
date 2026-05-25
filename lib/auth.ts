import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { twoFactor } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { db } from './db';
import * as schema from '@/db/schema';

export type Permission = 'member' | 'admin';

export const permissionLevels: Record<Permission, number> = {
  member: 1,
  admin: 2,
};

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      passkey: schema.passkey,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'member',
        input: false,
      },
    },
  },
  plugins: [
    twoFactor({
      issuer: 'TC Internal Docs',
    }),
    passkey(),
  ],
});

export type Session = typeof auth.$Infer.Session;
