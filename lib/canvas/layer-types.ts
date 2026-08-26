export type LayerKind = "TEXT" | "IMAGE" | "SHAPE";

type BaseLayer = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
};

export type TextLayer = BaseLayer & {
  kind: "TEXT";
  text: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  variableKey?: string;
};

export type ImageLayer = BaseLayer & {
  kind: "IMAGE";
  label: string;
  sourceUrl?: string;
};

export type ShapeLayer = BaseLayer & {
  kind: "SHAPE";
  shape: "rect" | "ellipse";
  fill: string;
};

export type ObjectLayer = TextLayer | ImageLayer | ShapeLayer;
