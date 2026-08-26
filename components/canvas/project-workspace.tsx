import { BoardCard, boardPreviewScale } from "@/components/canvas/board-card";
import type { ProjectWorkspaceData } from "@/lib/projects/project-types";

type ProjectWorkspaceProps = {
  project: ProjectWorkspaceData;
};

const productNamePlaceholder = "商品名称待补充";
const benefitPlaceholder = "卖点待补充";

function stringVariable(variables: Record<string, unknown>, key: string, fallback: string) {
  const value = variables[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function ProjectWorkspace({ project }: ProjectWorkspaceProps) {
  const boards = [...project.boards].sort((left, right) => left.positionX - right.positionX);
  const productName = stringVariable(project.variables, "product.name", productNamePlaceholder);
  const benefits = [1, 2, 3].map((index) =>
    stringVariable(project.variables, `marketing.benefit.${index}`, benefitPlaceholder),
  );
  const workspaceWidth = Math.max(...boards.map((board) => board.positionX + board.width), 0);
  const workspaceHeight = Math.max(...boards.map((board) => board.positionY + board.height), 0);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10">
      <div className="mx-auto max-w-[calc(100vw-3rem)]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-zinc-500">项目工作区</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">{project.name}</h1>
            <p className="mt-2 text-sm text-zinc-600">模板版本：{project.templateVersionId}</p>
          </div>
          <div className="flex gap-3">
            <button
              aria-describedby="workspace-future-actions-note"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-500 disabled:cursor-not-allowed"
              disabled
              type="button"
            >
              重新生成
            </button>
            <button
              aria-describedby="workspace-future-actions-note"
              className="rounded-md bg-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 disabled:cursor-not-allowed"
              disabled
              type="button"
            >
              导出整套
            </button>
          </div>
        </header>
        <p className="sr-only" id="workspace-future-actions-note">
          当前阶段仅支持查看，重新生成和导出将在后续阶段开放。
        </p>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-200 p-6">
          <section
            aria-label="五画板工作区"
            className="relative bg-zinc-100"
            role="region"
            style={{
              height: `${workspaceHeight * boardPreviewScale}px`,
              width: `${workspaceWidth * boardPreviewScale}px`,
            }}
          >
            {boards.map((board) => (
              <BoardCard board={board} benefits={benefits} key={board.id} productName={productName} />
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
