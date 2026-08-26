import { describe, expect, test } from "vitest";
import { normalizeLayers } from "@/lib/canvas/normalize-layers";
import type { TextLayer } from "@/lib/canvas/layer-types";

describe("normalizeLayers", () => {
  test("assigns deterministic stacked positions to legacy minimal layers", () => {
    const result = normalizeLayers({
      id: "b1",
      width: 1000,
      height: 1000,
      layers: [{ type: "product", name: "商品主体" }],
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: "b1-0",
        kind: "IMAGE",
        label: "商品主体",
        x: 0,
        y: 0,
      }),
    ]);
  });

  test("stacks multiple legacy layers top to bottom within board bounds", () => {
    const result = normalizeLayers({
      id: "b3",
      width: 1000,
      height: 1200,
      layers: [
        { type: "benefits", name: "核心卖点" },
        { type: "product", name: "商品主体" },
      ],
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("b3-0");
    expect(result[1].id).toBe("b3-1");
    expect(result[1].y).toBeGreaterThan(result[0].y);
    for (const layer of result) {
      expect(layer.x).toBeGreaterThanOrEqual(0);
      expect(layer.y + layer.height).toBeLessThanOrEqual(1200);
      expect(layer.x + layer.width).toBeLessThanOrEqual(1000);
    }
  });

  test("maps benefits/promotion/social legacy types to TEXT layers", () => {
    const result = normalizeLayers({
      id: "b4",
      width: 1000,
      height: 1200,
      layers: [{ type: "benefits", name: "核心卖点" }],
    });

    expect(result[0].kind).toBe("TEXT");
    expect((result[0] as TextLayer).text).toBe("核心卖点");
  });

  test("passes through already-positioned layers unchanged", () => {
    const positioned: TextLayer = {
      id: "L1",
      kind: "TEXT",
      x: 10,
      y: 20,
      width: 200,
      height: 40,
      rotation: 0,
      zIndex: 1,
      text: "咖啡机",
      fontSize: 32,
      color: "#111111",
      align: "left",
    };

    const result = normalizeLayers({
      id: "b1",
      width: 1000,
      height: 1000,
      layers: [positioned],
    });

    expect(result).toEqual([positioned]);
  });

  test("does not mutate the input layers array", () => {
    const input = [{ type: "product", name: "商品主体" }];
    normalizeLayers({ id: "b1", width: 1000, height: 1000, layers: input });
    expect(input).toEqual([{ type: "product", name: "商品主体" }]);
  });

  test("returns an empty array for empty or non-array layers", () => {
    expect(normalizeLayers({ id: "b1", width: 1000, height: 1000, layers: [] })).toEqual([]);
    expect(normalizeLayers({ id: "b1", width: 1000, height: 1000, layers: null })).toEqual([]);
  });
});
