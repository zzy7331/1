import { Rect, Text } from "react-konva";
import type { ObjectLayer } from "@/lib/canvas/layer-types";

type LayerNodeProps = {
  layer: ObjectLayer;
};

export function LayerNode({ layer }: LayerNodeProps) {
  const geometry = {
    x: layer.x,
    y: layer.y,
    width: layer.width,
    height: layer.height,
    rotation: layer.rotation,
  };

  if (layer.kind === "TEXT") {
    return (
      <Text
        {...geometry}
        align={layer.align}
        fill={layer.color}
        fontSize={layer.fontSize}
        text={layer.text}
      />
    );
  }

  if (layer.kind === "SHAPE") {
    return <Rect {...geometry} fill={layer.fill} />;
  }

  return <Rect {...geometry} dash={[12, 12]} fill="#e4e4e7" stroke="#a1a1aa" />;
}
