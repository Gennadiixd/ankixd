import { connection } from "next/server";
import { Suspense } from "react";
import Loading from "@/app/loading";
import { FormError, PageHeader, Shell, controlClass } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importDeck } from "@/lib/actions";
import { listFolders } from "@/lib/repo";

export default function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<Loading />}>
      <ImportBody searchParams={searchParams} />
    </Suspense>
  );
}

async function ImportBody({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { error } = await searchParams;
  const folders = await listFolders();

  return (
    <Shell>
      <PageHeader
        title="Импорт"
        hint="XML-колода: поля с сторонами, карточки, теги и HTML. Импорт создаёт новую колоду."
      />
      <FormError message={error} />
      <form action={importDeck} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="file">Файл</Label>
          <Input id="file" name="file" type="file" accept=".xml,text/xml" required className="h-10" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="folderId">Папка</Label>
          <select id="folderId" name="folderId" className={controlClass} defaultValue="">
            <option value="">Без папки</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" className="h-10">
          Импортировать
        </Button>
      </form>
    </Shell>
  );
}
