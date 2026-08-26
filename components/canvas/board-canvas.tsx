"use client";

import { Layer as KonvaLayer, Stage } from "react-konva";
import { LayerNode } from "@/components/canvas/layer-node";
import { normalizeLayers } from "@/lib/canvas/normalize-layers";
import type { ProjectWorkspaceBoard } from "@/lib/projects/project-types";

type BoardCanvasProps = {
  board: ProjectWorkspaceBoard;
  productName: string;
  benefits: string[];
};

export const boardPreviewScale = 0.2;

function layerSummary(layer: ReturnType<typeof normalizeLayers>[number]) {
  if (layer.kind === "TEXT") {
    return layer.text;
  }
  if (layer.kind === "IMAGE") {
    return layer.label;
  }
  return `${layer.shape}形状`;
}

export function BoardCanvas({ board, productName, benefits }: BoardCanvasProps) {
  const layers = normalizeLayers(board);
  const scaledWidth = board.width * boardPreviewScale;
  const scaledHeight = board.height * boardPreviewScale;

  return (
    <article
      aria-label={`${board.name}画板`}
      className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      data-board-kind={board.kind}
      data-original-height={board.height}
      data-original-width={board.width}
      data-original-x={board.positionX}
      data-original-y={board.positionY}
      data-testid="marketing-board"
      style={{
        height: `${scaledHeight}px`,
        left: `${board.positionX * boardPreviewScale}px`,
        position: "absolute",
        top: `${board.positionY * boardPreviewScale}px`,
        width: `${scaledWidth}px`,
      }}
    >
      <div className="border-b border-zinc-100 px-5 py-4">
        <p className="text-sm font-medium text-zinc-900">{board.name}</p>
        <p className="mt-1 text-xs text-zinc-500">{productName}</p>
      </div>

      <div className="relative flex-1">
        <Stage height={scaledHeight} width={scaledWidth}>
          <KonvaLayer scaleX={boardPreviewScale} scaleY={boardPreviewScale}>
            {layers.map((layer) => (
              <LayerNode key={layer.id} layer={layer} />
            ))}
          </KonvaLayer>
        </Stage>

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-center p-5 text-zinc-700">
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
      </div>

      <p className="border-t border-zinc-100 px-5 py-3 text-sm font-medium text-amber-700">
        等待 AI 生成
      </p>

      {layers.length > 0 ? (
        <ul aria-label={`${board.name}图层`} className="sr-only">
          {layers.map((layer) => (
            <li key={layer.id}>{layerSummary(layer)}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
