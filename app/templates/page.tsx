import { TemplateCard } from "@/components/templates/template-card";
import { listPublishedTemplates } from "@/lib/templates/get-template";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await listPublishedTemplates();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">选择一个生产模板</h1>
        <p className="mt-3 text-zinc-600">从经过验证的模板开始，快速创建完整的营销素材套装。</p>
      </header>

      {templates.length > 0 ? (
        <section aria-label="可用生产模板" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard key={template.templateVersionId} template={template} />
          ))}
        </section>
      ) : (
        <p className="mt-8 rounded-lg border border-dashed border-zinc-300 p-6 text-zinc-600">
          暂时没有可用的生产模板，请稍后再试。
        </p>
      )}
    </main>
  );
}
