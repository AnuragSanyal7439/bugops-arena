import session from "express-session";
import type { Prisma, PrismaClient } from "@prisma/client";

type SessionPayload = session.SessionData & Record<string, unknown>;

export class PrismaSessionStore extends session.Store {
  constructor(private readonly prisma: PrismaClient) {
    super();
  }

  override get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): void {
    this.prisma.session
      .findUnique({ where: { sid } })
      .then((stored) => {
        if (!stored || stored.expiresAt.getTime() <= Date.now()) {
          callback(null, null);
          return;
        }
        callback(null, stored.data as SessionPayload);
      })
      .catch((error) => callback(error));
  }

  override set(sid: string, sess: session.SessionData, callback?: (err?: unknown) => void): void {
    const expiresAt = getExpiry(sess);
    this.prisma.session
      .upsert({
        where: { sid },
        create: { sid, data: serializeSession(sess), expiresAt },
        update: { data: serializeSession(sess), expiresAt }
      })
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  override destroy(sid: string, callback?: (err?: unknown) => void): void {
    this.prisma.session
      .delete({ where: { sid } })
      .catch((error) => {
        if (error?.code !== "P2025") throw error;
      })
      .then(() => callback?.())
      .catch((error) => callback?.(error));
  }

  override touch(sid: string, sess: session.SessionData, callback?: () => void): void {
    this.prisma.session
      .update({
        where: { sid },
        data: { expiresAt: getExpiry(sess) }
      })
      .catch((error) => {
        if (error?.code !== "P2025") throw error;
      })
      .then(() => callback?.())
      .catch(() => callback?.());
  }
}

function getExpiry(sess: session.SessionData): Date {
  const cookieExpires = sess.cookie?.expires;
  if (cookieExpires) {
    return new Date(cookieExpires);
  }

  const maxAge = sess.cookie?.maxAge || 1000 * 60 * 60 * 24 * 7;
  return new Date(Date.now() + maxAge);
}

function serializeSession(sess: session.SessionData): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(sess)) as Prisma.InputJsonValue;
}
