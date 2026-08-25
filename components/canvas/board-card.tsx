import type { ProjectWorkspaceBoard } from "@/lib/projects/project-types";

type BoardCardProps = {
  board: ProjectWorkspaceBoard;
  productName: string;
  benefits: string[];
};

export function BoardCard({ board, productName, benefits }: BoardCardProps) {
  return (
    <article
      aria-label={`${board.name}画板`}
      className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      data-board-kind={board.kind}
      data-testid="marketing-board"
      style={{
        height: `${board.height}px`,
        left: `${board.positionX}px`,
        position: "absolute",
        top: `${board.positionY}px`,
        width: `${board.width}px`,
      }}
    >
      <div className="border-b border-zinc-100 px-5 py-4">
        <p className="text-sm font-medium text-zinc-900">{board.name}</p>
        <p className="mt-1 text-xs text-zinc-500">{productName}</p>
      </div>

      <div className="flex flex-1 flex-col justify-center p-5 text-zinc-700">
        {board.kind === "HERO_WHITE" ? (
          <p className="text-lg font-semibold text-zinc-900">商品白底主图</p>
        ) : null}
        {board.kind === "BENEFITS" ? (
          <ul className="space-y-2 text-sm">
            {benefits.map((benefit, index) => (
              <li key={`${benefit}-${index}`}>{benefit}</li>
            ))}
          </ul>
        ) : null}
        {board.kind !== "HERO_WHITE" && board.kind !== "BENEFITS" ? (
          <p className="text-sm text-zinc-500">素材阶段占位</p>
        ) : null}
      </div>

      <p className="border-t border-zinc-100 px-5 py-3 text-sm font-medium text-amber-700">
        等待 AI 生成
      </p>
    </article>
  );
}
