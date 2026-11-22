import { connection } from "next/server";
import { TopBar } from "@/components/top-bar";
import { currentUser } from "@/lib/auth";

export async function AccountBar() {
  await connection();
  const user = await currentUser();
  if (!user) return null;
  return <TopBar name={user.name} />;
}
