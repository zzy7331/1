import { createElement, Fragment, type ReactNode } from "react";
import { vi } from "vitest";
import "dotenv/config";
import "@testing-library/jest-dom/vitest";

// jsdom has no real <canvas> 2D context, and Konva's Node entry point requires
// the native `canvas` package. Unit tests render a lightweight DOM stub instead;
// real Konva rendering and interaction are covered by Playwright e2e.
vi.mock("react-konva", () => ({
  Layer: ({ children }: { children?: ReactNode }) => createElement(Fragment, null, children),
  Rect: () => null,
  Stage: ({ children, height, width }: { children?: ReactNode; height?: number; width?: number }) =>
    createElement(
      "div",
      { "data-testid": "konva-stage-stub" },
      createElement("canvas", { height, width }),
      children,
    ),
  Text: () => null,
}));
