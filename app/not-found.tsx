import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-8">
      <h1 className="text-lg font-semibold">Страница не найдена</h1>
      <Link href="/" className="text-sm underline">
        К колодам
      </Link>
    </div>
  );
}
