import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { parse } from "cookie";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionUser } from "../localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const cookies = parse(opts.req.headers.cookie ?? "");
  user = await getSessionUser(cookies[COOKIE_NAME]);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
