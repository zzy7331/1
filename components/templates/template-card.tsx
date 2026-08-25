/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { TemplateSummary } from "@/lib/templates/template-types";

type TemplateCardProps = {
  template: TemplateSummary;
};

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <img
        src={template.coverUrl}
        alt={`${template.name}封面`}
        className="h-44 w-full bg-zinc-100 object-cover"
      />
      <div className="space-y-3 p-5">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{template.name}</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">{template.description}</p>
        </div>
        <p className="text-sm text-zinc-500">包含 {template.boardCount} 张画板</p>
        <Link
          href={`/templates/${template.slug}`}
          className="inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
        >
          查看模板详情
        </Link>
      </div>
    </article>
  );
}
