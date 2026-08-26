import type { ObjectLayer } from "@/lib/canvas/layer-types";

type NormalizableBoard = {
  id: string;
  width: number;
  height: number;
  layers: unknown;
};

const legacyTextTypes = new Set(["benefits", "promotion", "social"]);

function isObjectLayer(value: unknown): value is ObjectLayer {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    (candidate.kind === "TEXT" || candidate.kind === "IMAGE" || candidate.kind === "SHAPE") &&
    typeof candidate.x === "number" &&
    typeof candidate.y === "number" &&
    typeof candidate.width === "number" &&
    typeof candidate.height === "number"
  );
}

function normalizeLegacyLayer(
  board: NormalizableBoard,
  raw: unknown,
  index: number,
): ObjectLayer {
  const id = `${board.id}-${index}`;
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const type = typeof record.type === "string" ? record.type : "";
  const name = typeof record.name === "string" ? record.name : "";

  const laneHeight = board.height / 3;
  const y = Math.min(index * laneHeight, Math.max(board.height - laneHeight, 0));
  const height = Math.min(laneHeight, board.height);

  const base = {
    id,
    x: 0,
    y,
    width: board.width,
    height,
    rotation: 0,
    zIndex: index,
  };

  if (legacyTextTypes.has(type)) {
    return {
      ...base,
      kind: "TEXT",
      text: name,
      fontSize: 32,
      color: "#111111",
      align: "left",
    };
  }

  return {
    ...base,
    kind: "IMAGE",
    label: name || type,
  };
}

export function normalizeLayers(board: NormalizableBoard): ObjectLayer[] {
  if (!Array.isArray(board.layers)) {
    return [];
  }

  return board.layers.map((raw, index) =>
    isObjectLayer(raw) ? raw : normalizeLegacyLayer(board, raw, index),
  );
}
