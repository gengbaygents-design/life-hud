import { auth } from '@/auth';
import db from '@/db';
import type { ORPCContext } from '@/types';

interface ServerConfig {
  resolveUser: (ctx: ORPCContext) => Promise<void>;
  socketAuth: (cookie: string) => Promise<{ userId: string } | null>;
  authHandler?: (request: Request) => Promise<Response> | Response;
}

const authServerConfig: ServerConfig = {
  resolveUser: async (ctx) => {
    if (!ctx.rawRequest) {
      return;
    }

    const session = await auth.api.getSession({
      headers: ctx.rawRequest.headers,
    });

    if (session?.user) {
      const user = await db.users.findFirst({ where: { id: session.user.id, deletedAt: null } });
      if (user) {
        ctx.user = user;
      }
    }
  },

  socketAuth: async (cookieString) => {
    const headers = new Headers();
    headers.set('cookie', cookieString);

    const session = await auth.api.getSession({ headers });
    return session?.user ? { userId: session.user.id } : null;
  },

  authHandler: (request) => auth.handler(request),
};

export default authServerConfig;
