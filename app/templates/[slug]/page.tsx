import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateProjectWizard } from "@/components/wizard/create-project-wizard";
import { getPublishedTemplate } from "@/lib/templates/get-template";

export const dynamic = "force-dynamic";

type TemplateDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ create?: string | string[] }>;
};

export default async function TemplateDetailPage({ params, searchParams }: TemplateDetailPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const template = await getPublishedTemplate(slug);

  if (!template) {
    notFound();
  }

  if (query.create === "1") {
    return (
      <main className="mx-auto max-w-2xl px-6 py-12">
        <Link href={`/templates/${template.slug}`} className="text-sm font-medium text-zinc-600">
          返回模板详情
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900">
          创建{template.name}
        </h1>
        <p className="mt-2 text-zinc-600">填写三步信息，生成完整的营销素材项目。</p>
        <CreateProjectWizard templateVersionId={template.templateVersionId} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="text-sm font-medium text-zinc-500">生产模板</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{template.name}</h1>
      <p className="mt-3 max-w-2xl text-zinc-600">{template.description}</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 p-5">
          <h2 className="font-semibold text-zinc-900">五类输出</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {template.boards.map((board) => (
              <li key={board.kind}>{board.name}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5">
          <h2 className="font-semibold text-zinc-900">必需输入</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700">
            {template.requiredInputs.map((input) => (
              <li key={input.key}>{input.label}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5">
          <h2 className="font-semibold text-zinc-900">工作流步骤</h2>
          <ol className="mt-3 space-y-2 text-sm text-zinc-700">
            {template.workflowSteps.map((step) => (
              <li key={step.key}>{step.name}</li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-zinc-200 p-5">
          <h2 className="font-semibold text-zinc-900">创作说明</h2>
          <dl className="mt-3 space-y-2 text-sm text-zinc-700">
            <div className="flex justify-between gap-4">
              <dt>预计耗时</dt>
              <dd>{template.estimatedMinutes} 分钟</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>版本要求</dt>
              <dd>{template.versionRequirement}</dd>
            </div>
          </dl>
        </section>
      </div>

      <Link
        href={`/templates/${template.slug}?create=1`}
        className="mt-8 inline-flex rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white"
      >
        用此模板创作
      </Link>
    </main>
  );
}
