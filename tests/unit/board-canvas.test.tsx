import { render, screen } from "@testing-library/react";
import { BoardCanvas } from "@/components/canvas/board-canvas";
import type { ProjectWorkspaceBoard } from "@/lib/projects/project-types";

const heroBoard: ProjectWorkspaceBoard = {
  id: "board-hero",
  kind: "HERO_WHITE",
  name: "白底主图",
  width: 1000,
  height: 1000,
  positionX: 0,
  positionY: 0,
  layers: [{ type: "product", name: "咖啡机主体" }],
};

const benefitsBoard: ProjectWorkspaceBoard = {
  id: "board-benefits",
  kind: "BENEFITS",
  name: "三卖点图",
  width: 1000,
  height: 1200,
  positionX: 2240,
  positionY: 0,
  layers: [],
};

test("keeps the marketing-board identity attributes and product heading", () => {
  render(<BoardCanvas board={heroBoard} productName="咖啡机" benefits={[]} />);

  const article = screen.getByTestId("marketing-board");
  expect(article).toHaveAttribute("data-board-kind", "HERO_WHITE");
  expect(article).toHaveAttribute("data-original-width", "1000");
  expect(screen.getByText("咖啡机")).toBeInTheDocument();
  expect(screen.getByText("商品白底主图")).toBeInTheDocument();
});

test("renders a Konva stage canvas for the board", () => {
  const { container } = render(<BoardCanvas board={heroBoard} productName="咖啡机" benefits={[]} />);
  expect(container.querySelector("canvas")).not.toBeNull();
});

test("mirrors normalized layer content in an accessible sr-only summary", () => {
  render(<BoardCanvas board={heroBoard} productName="咖啡机" benefits={[]} />);
  expect(screen.getByText("咖啡机主体")).toBeInTheDocument();
});

test("renders no layer summary when the board has no layers", () => {
  render(<BoardCanvas board={benefitsBoard} productName="咖啡机" benefits={["快速加热", "精准控温", "容易清洁"]} />);
  expect(screen.queryByRole("list", { name: "三卖点图图层" })).not.toBeInTheDocument();
});
