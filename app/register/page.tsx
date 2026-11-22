import { connection } from "next/server";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { FormError, PageHeader, Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findUserBySession, SESSION_COOKIE } from "@/lib/session";
import { register } from "@/lib/auth-actions";

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <RegisterBody searchParams={searchParams} />
    </Suspense>
  );
}

async function RegisterBody({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  if (findUserBySession(token)) redirect("/");
  const { error } = await searchParams;

  return (
    <Shell>
      <PageHeader title="Регистрация" hint="Новый логин получит свои колоды" />
      <FormError message={error} />
      <form action={register} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Логин</Label>
          <Input id="name" name="name" autoComplete="username" required autoFocus className="h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Пароль</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required className="h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="again">Пароль ещё раз</Label>
          <Input id="again" name="again" type="password" autoComplete="new-password" required className="h-10" />
        </div>
        <Button type="submit" className="h-10">
          Создать аккаунт
        </Button>
      </form>
      <Link href="/login" className="text-sm text-muted-foreground underline">
        Уже есть аккаунт
      </Link>
    </Shell>
  );
}
