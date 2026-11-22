"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 py-8">
      <h1 className="text-lg font-semibold">Что-то пошло не так</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button className="w-fit text-sm underline" onClick={() => reset()} type="button">
        Попробовать снова
      </button>
    </div>
  );
}
