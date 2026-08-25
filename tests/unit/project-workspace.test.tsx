import { render, screen } from "@testing-library/react";
import { ProjectWorkspace } from "@/components/canvas/project-workspace";
import {
  mapProjectWorkspaceData,
  type ProjectWorkspaceData,
} from "@/lib/projects/project-types";

const workspace: ProjectWorkspaceData = {
  id: "project-1",
  name: "山岚保温杯营销素材",
  templateVersionId: "version-1",
  variables: {
    "product.name": "山岚保温杯",
    "marketing.benefit.1": "轻巧便携",
    "marketing.benefit.2": "12 小时保温",
    "marketing.benefit.3": "食品级不锈钢",
  },
  boards: [
    { id: "board-social", kind: "SOCIAL_SQUARE", name: "社媒方图", width: 1080, height: 1080, positionX: 4560, positionY: 0, layers: [] },
    { id: "board-promotion", kind: "PROMOTION", name: "促销海报", width: 1080, height: 1440, positionX: 3360, positionY: 0, layers: [] },
    { id: "board-benefits", kind: "BENEFITS", name: "三卖点图", width: 1000, height: 1200, positionX: 2240, positionY: 0, layers: [] },
    { id: "board-scene", kind: "SCENE", name: "场景图", width: 1000, height: 1000, positionX: 1120, positionY: 0, layers: [] },
    { id: "board-hero", kind: "HERO_WHITE", name: "白底主图", width: 1000, height: 1000, positionX: 0, positionY: 0, layers: [] },
  ],
};

test("renders the initialized five-board workspace with product and benefit content", () => {
  render(<ProjectWorkspace project={workspace} />);

  expect(screen.getByRole("heading", { name: "山岚保温杯营销素材" })).toBeInTheDocument();
  expect(screen.getByText("模板版本：version-1")).toBeInTheDocument();
  expect(screen.getAllByTestId("marketing-board")).toHaveLength(5);
  expect(screen.getByText("商品白底主图")).toBeInTheDocument();
  expect(screen.getAllByText("山岚保温杯").length).toBeGreaterThan(0);
  expect(screen.getByText("轻巧便携")).toBeInTheDocument();
  expect(screen.getByText("12 小时保温")).toBeInTheDocument();
  expect(screen.getByText("食品级不锈钢")).toBeInTheDocument();
  expect(screen.getAllByText("等待 AI 生成")).toHaveLength(5);
});

test("uses persisted coordinates and dimensions after sorting boards by position", () => {
  const { container } = render(<ProjectWorkspace project={workspace} />);

  const boards = screen.getAllByTestId("marketing-board");
  expect(boards.map((board) => board.getAttribute("data-board-kind"))).toEqual([
    "HERO_WHITE",
    "SCENE",
    "BENEFITS",
    "PROMOTION",
    "SOCIAL_SQUARE",
  ]);
  expect(screen.getByRole("region", { name: "五画板工作区" })).toHaveStyle({
    width: "5640px",
    height: "1440px",
  });
  expect(container.querySelector('[data-board-kind="BENEFITS"]')).toHaveStyle({
    left: "2240px",
    top: "0px",
    width: "1000px",
    height: "1200px",
  });
});

test("labels every board and keeps future actions unavailable with an explanation", () => {
  render(<ProjectWorkspace project={workspace} />);

  for (const [name, kind] of [
    ["白底主图", "HERO_WHITE"],
    ["场景图", "SCENE"],
    ["三卖点图", "BENEFITS"],
    ["促销海报", "PROMOTION"],
    ["社媒方图", "SOCIAL_SQUARE"],
  ]) {
    expect(screen.getByRole("article", { name: `${name}画板` })).toHaveAttribute(
      "data-board-kind",
      kind,
    );
  }

  for (const name of ["重新生成", "导出整套"]) {
    expect(screen.getByRole("button", { name })).toBeDisabled();
    expect(screen.getByRole("button", { name })).toHaveAttribute(
      "aria-describedby",
      "workspace-future-actions-note",
    );
  }
  expect(screen.getByText("当前阶段仅支持查看，重新生成和导出将在后续阶段开放。")).toBeInTheDocument();
});

test("uses safe Chinese placeholders when required variables are missing or malformed", () => {
  render(
    <ProjectWorkspace
      project={{
        ...workspace,
        variables: {
          "product.name": 42 as unknown as string,
          "marketing.benefit.1": "轻巧便携",
        },
      }}
    />,
  );

  expect(screen.getAllByText("商品名称待补充").length).toBeGreaterThan(0);
  expect(screen.getByText("卖点待补充")).toBeInTheDocument();
});

test("maps only string project variables into the read-only workspace DTO", () => {
  const mapped = mapProjectWorkspaceData({
    ...workspace,
    variables: [
      { key: "product.name", value: "山岚保温杯" },
      { key: "marketing.benefit.1", value: "轻巧便携" },
      { key: "marketing.benefit.2", value: ["错误结构"] },
    ],
  });

  expect(mapped.variables).toEqual({
    "product.name": "山岚保温杯",
    "marketing.benefit.1": "轻巧便携",
  });
  expect(mapped.boards.map((board) => board.id)).toEqual([
    "board-hero",
    "board-scene",
    "board-benefits",
    "board-promotion",
    "board-social",
  ]);
});
