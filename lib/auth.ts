import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findUserBySession, SESSION_COOKIE } from "@/lib/session";

export const currentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  return findUserBySession(token);
});

export const requireUser = cache(async () => {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
});

export async function requireUserId() {
  return (await requireUser()).id;
}
