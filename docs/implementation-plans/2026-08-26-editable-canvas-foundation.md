# Editable Canvas Foundation Implementation Plan

**Goal:** Replace the read-only board previews from Phase 1 with a real Konva canvas per board that renders positioned, typed layer objects, lets a user select and move/resize/edit them, and persists the result. AI generation, candidate groups, and consistency checks remain out of scope; this phase only makes the already-initialized boards editable.

**Architecture:** `Board.layers` (already a mutable, project-scoped JSON column — unlike the immutable `TemplateVersion.boardDefinition`) becomes the source of truth for a typed `ObjectLayer` union (text / image-placeholder / shape). A pure `normalizeLayers` function upgrades the minimal Phase 1 seed shape (`{ type, name }`) into fully positioned layers with deterministic defaults, so no template version migration is required. `react-konva` renders the normalized layers inside each board's `Stage`. Every canvas element is mirrored by an accessible, testable DOM summary (the current text assertions and the e2e journey must keep passing) since canvas content is invisible to the DOM and to screen readers. Edits go through one authenticated-free (no auth in this phase, matching Phase 1) `PATCH /api/boards/[boardId]` route that validates and persists the full layer array in one transaction-free update.

**Tech Stack:** adds `konva@9.3.16`, `react-konva@19.0.10` to the existing Next.js 15 / React 19 / TypeScript 5 / Prisma 6 / Zod 3 / Vitest 3 / Playwright 1.52 / pnpm 10 stack from Phase 1.

**Spec:** `docs/product-design/template-canvas-product-design.md` §7 (画布编辑器), §7.2–7.3, §9.1 (内容联动, partial: initial content only, not live re-sync).

## Global Constraints

- `TemplateVersion.boardDefinition` (and its DB-enforced immutability) is untouched. Only `Board.layers`, which is per-project and already mutable, changes shape.
- Every layer must have a stable `id` (existing legacy layers get a deterministic id derived from board id + array index so normalization is idempotent).
- Canvas rendering must never be the only source of information: each `BoardCanvas` renders a paired `sr-only` accessible summary (layer type, text content, label) so Testing Library and Playwright text queries keep working without reading pixels.
- `konva`'s Node entry point (`main` in its `package.json`) requires the native `canvas` package and is not what browsers load (they get the `browser` field build); jsdom's module resolution follows Node's `main`, so real Konva cannot run inside Vitest at all, independent of any canvas polyfill. Unit tests mock the whole `react-konva` module (`vitest.setup.ts`) with lightweight DOM stubs (`Stage` renders a real `<canvas>` element and its children; `Layer`/`Text`/`Rect` are pass-through/no-op) so component tests exercise real production code up to the Konva boundary. Do not skip or delete existing text-based assertions to work around this — they must keep passing against the accessible summary, not against mocked canvas output.
- No AI generation, candidate groups, undo/redo history, or multi-select in this phase. One layer selected at a time; moving/resizing writes absolute pixel coordinates in the board's original (unscaled) coordinate space, consistent with the `boardPreviewScale` convention from Phase 1.
- All user-visible interface copy is Simplified Chinese.
- Package management commands use pnpm.

## Shared Interfaces

```ts
export type LayerKind = "TEXT" | "IMAGE" | "SHAPE";

export type ObjectLayer =
  | {
      id: string;
      kind: "TEXT";
      x: number; y: number; width: number; height: number; rotation: number; zIndex: number;
      text: string;
      fontSize: number;
      color: string;
      align: "left" | "center" | "right";
      variableKey?: string;
    }
  | {
      id: string;
      kind: "IMAGE";
      x: number; y: number; width: number; height: number; rotation: number; zIndex: number;
      label: string;
      sourceUrl?: string;
    }
  | {
      id: string;
      kind: "SHAPE";
      x: number; y: number; width: number; height: number; rotation: number; zIndex: number;
      shape: "rect" | "ellipse";
      fill: string;
    };

export type UpdateBoardLayersInput = {
  layers: ObjectLayer[];
};
```

## File Structure

```text
lib/
├─ canvas/
│  ├─ layer-types.ts               ObjectLayer union, LayerKind
│  ├─ normalize-layers.ts          normalizeLayers(board): ObjectLayer[]
│  └─ update-board-layers.ts       updateBoardLayers(boardId, layers): Promise<ObjectLayer[]>
├─ validation/
│  └─ update-board-layers-schema.ts  Zod boundary for PATCH payload
components/
├─ canvas/
│  ├─ board-canvas.tsx             Konva Stage + accessible summary (replaces board-card.tsx usage)
│  ├─ layer-node.tsx               Renders one ObjectLayer as a Konva node
│  ├─ layer-property-panel.tsx     Text/shape property editor for the selected layer
│  └─ project-workspace.tsx        Modified: renders BoardCanvas, owns selection state, saves via fetch
app/
└─ api/boards/[boardId]/route.ts   PATCH handler
tests/
├─ unit/
│  ├─ normalize-layers.test.ts
│  ├─ update-board-layers-schema.test.ts
│  ├─ board-canvas.test.tsx
│  ├─ layer-property-panel.test.tsx
│  └─ board-route.test.ts
└─ integration/
   └─ update-board-layers.test.ts
e2e/
└─ edit-board-layer.spec.ts
vitest.setup.ts                    Modified: import vitest-canvas-mock
```

### Task 1: Layer Domain Model, Normalization, and Read-Only Konva Rendering

**Files:**
- Create: `lib/canvas/layer-types.ts`, `lib/canvas/normalize-layers.ts`
- Create: `components/canvas/board-canvas.tsx`, `components/canvas/layer-node.tsx`
- Modify: `components/canvas/project-workspace.tsx` (render `BoardCanvas` instead of `BoardCard`)
- Modify: `vitest.setup.ts`, `package.json`
- Test: `tests/unit/normalize-layers.test.ts`, `tests/unit/board-canvas.test.tsx`

**Interfaces:**
- Consumes: `ProjectWorkspaceBoard.layers` (unknown JSON), `ProjectWorkspaceData.variables`.
- Produces: `normalizeLayers(board: { width: number; height: number; layers: unknown }): ObjectLayer[]`; `<BoardCanvas board productName benefits />`.

- [ ] **Step 1: Install canvas dependencies**

```bash
pnpm add konva@9.3.16 react-konva@19.0.10
```

- [ ] **Step 2: Write the failing normalization test**

```ts
import { normalizeLayers } from "@/lib/canvas/normalize-layers";

test("assigns deterministic stacked positions to legacy minimal layers", () => {
  const result = normalizeLayers({
    id: "b1", width: 1000, height: 1000,
    layers: [{ type: "product", name: "商品主体" }],
  });
  expect(result).toEqual([
    expect.objectContaining({ id: "b1-0", kind: "IMAGE", label: "商品主体", x: 0, y: 0 }),
  ]);
});

test("passes through already-positioned layers unchanged", () => {
  const positioned = { id: "L1", kind: "TEXT", x: 10, y: 20, width: 200, height: 40, rotation: 0, zIndex: 1, text: "咖啡机", fontSize: 32, color: "#111111", align: "left" as const };
  const result = normalizeLayers({ id: "b1", width: 1000, height: 1000, layers: [positioned] });
  expect(result).toEqual([positioned]);
});
```

- [ ] **Step 3: Run and verify the missing module failure**

Run: `pnpm test -- tests/unit/normalize-layers.test.ts`
Expected: FAIL because `normalizeLayers` does not exist.

- [ ] **Step 4: Implement `layer-types.ts` and `normalize-layers.ts`**

`normalizeLayers` must: recognize an already-valid `ObjectLayer` (has `kind`, numeric `x`/`y`/`width`/`height`) and return it unchanged; otherwise map the legacy `{ type, name }` shape to one full-width `IMAGE` layer (types `product`, `scene`) or `TEXT` layer (types `benefits`, `promotion`, `social`) stacked top-to-bottom inside the board bounds with an id of `${board.id}-${index}`. Never mutate the input.

- [ ] **Step 5: Write the failing BoardCanvas test**

```tsx
import { render, screen } from "@testing-library/react";
import { BoardCanvas } from "@/components/canvas/board-canvas";

test("renders an accessible summary alongside the canvas", () => {
  render(<BoardCanvas board={boardFixture} productName="咖啡机" benefits={["快速加热", "精准控温", "容易清洁"]} />);
  expect(screen.getByText("咖啡机")).toBeInTheDocument();
  expect(screen.getByTestId("marketing-board")).toHaveAttribute("data-board-kind", "HERO_WHITE");
});
```

- [ ] **Step 6: Mock `react-konva` for the test runtime and implement `BoardCanvas`/`LayerNode`**

Add the `vi.mock("react-konva", ...)` DOM-stub factory to `vitest.setup.ts` (see Global Constraints). `BoardCanvas` renders a `Stage`/`Layer` sized and scaled exactly like Phase 1's `boardPreviewScale`, keeps every `data-testid`/`data-board-kind`/`data-original-*` attribute on the wrapping element, calls `normalizeLayers`, and renders one `LayerNode` per entry (`Konva.Text` for `TEXT`, `Konva.Rect` with a centered label for `IMAGE`/`SHAPE`). Below the `Stage`, render a `sr-only` list mirroring each layer's text/label so existing and new text-based assertions keep working without reading canvas pixels.

- [ ] **Step 7: Wire into `ProjectWorkspace` and update `package.json`/lockfile**

Replace the `BoardCard` import/usage with `BoardCanvas`. Keep `board-card.tsx` deleted only if nothing else references it; otherwise leave it and stop importing it.

- [ ] **Step 8: Verify**

Run:

```bash
pnpm test -- tests/unit/normalize-layers.test.ts tests/unit/board-canvas.test.tsx tests/unit/project-workspace.test.tsx
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all pass; production build still statically/dynamically generates `/projects/[projectId]`.

- [ ] **Step 9: Commit**

```bash
git add lib/canvas components/canvas package.json pnpm-lock.yaml vitest.setup.ts tests/unit/normalize-layers.test.ts tests/unit/board-canvas.test.tsx
git commit -m "feat: render board layers with Konva and an accessible summary"
```

### Task 2: Selection, Move/Resize, and Persisted Save

**Files:**
- Create: `lib/validation/update-board-layers-schema.ts`, `lib/canvas/update-board-layers.ts`
- Create: `app/api/boards/[boardId]/route.ts`
- Modify: `components/canvas/board-canvas.tsx`, `components/canvas/layer-node.tsx`, `components/canvas/project-workspace.tsx`
- Test: `tests/unit/update-board-layers-schema.test.ts`, `tests/unit/board-route.test.ts`, `tests/integration/update-board-layers.test.ts`

**Interfaces:**
- Consumes: `ObjectLayer[]` from Task 1.
- Produces: `updateBoardLayers(boardId: string, layers: ObjectLayer[]): Promise<ObjectLayer[]>`; `PATCH /api/boards/{boardId}` accepting `{ layers: ObjectLayer[] }`, returning `{ board: { id, layers } }` with status 200.

- [ ] **Step 1: Write the failing schema and route tests** (reject unknown `kind`, out-of-range `rotation`, negative `width`/`height`, duplicate `id`; 404 for an unknown board id; 400 with `{ code: "INVALID_INPUT", fieldErrors }` for a malformed body)

- [ ] **Step 2: Run and verify failure**, then implement the Zod schema and `updateBoardLayers` (single `prisma.board.update`, no template/version involvement, throws a typed `BoardNotFoundError` the route maps to 404).

- [ ] **Step 3: Implement the route** reusing the bounded JSON reader (`lib/http/read-bounded-json.ts`) from Phase 1.

- [ ] **Step 4: Add Konva `Transformer` and drag/resize handling**

Clicking a `LayerNode` selects it (local React state in `ProjectWorkspace`, one selected id across the whole workspace). A selected `TEXT`/`IMAGE`/`SHAPE` node gets a `Transformer` bound to it; `dragend`/`transformend` update local layer state immediately (optimistic) and enqueue a save.

- [ ] **Step 5: Save on change**

`ProjectWorkspace` debounces (500ms) a `PATCH` to `/api/boards/{boardId}` with the board's full current layer array after any move/resize; show a small "已保存"/"保存中"/"保存失败，请重试" status per board tied to the in-flight request state.

- [ ] **Step 6: Integration test**: create a project, `PATCH` one board with a moved layer, refetch, assert the new `x`/`y` persisted and other boards are untouched.

- [ ] **Step 7: Verify** (`pnpm test`, `pnpm test:integration`, `pnpm typecheck`, `pnpm build`) and **commit**.

### Task 3: Text and Shape Property Panel

**Files:**
- Create: `components/canvas/layer-property-panel.tsx`
- Modify: `components/canvas/project-workspace.tsx`
- Test: `tests/unit/layer-property-panel.test.tsx`

**Interfaces:**
- Consumes: the currently selected `ObjectLayer` and a `onChange(layer: ObjectLayer)` callback.
- Produces: `<LayerPropertyPanel layer onChange />`, a right-side panel matching product design §7.1's "对象属性" region.

- [ ] **Step 1: Write the failing panel test** — selecting a `TEXT` layer shows an editable text field, font-size stepper, and color input; editing the text field calls `onChange` with the updated layer within one input event (no separate confirm step); selecting nothing renders a "选择一个元素进行编辑" placeholder.

- [ ] **Step 2: Implement the panel**, wire it into `ProjectWorkspace` next to the canvas, route its `onChange` through the same debounced save path as Task 2.

- [ ] **Step 3: Verify and commit.**

### Task 4: Variable-Seeded Initial Content and End-to-End Edit Journey

**Files:**
- Modify: `lib/canvas/normalize-layers.ts` (accept `variables` to seed initial `TEXT.text`/`variableKey` for legacy layers, e.g. `BENEFITS` → `marketing.benefit.{n}`)
- Create: `e2e/edit-board-layer.spec.ts`
- Modify: `docs/development/phase-1.md` → new `docs/development/phase-2.md` recording scope and the next boundary (AI job orchestration; product-consistency/export checks)

**Interfaces:**
- Consumes: the complete Task 1–3 stack.
- Produces: a browser-level journey proving edits survive a reload.

- [ ] **Step 1: Extend `normalizeLayers`** to take the project's `variables` map and, only for legacy (not-yet-persisted) layers, initialize `TEXT.text` from the matching variable (falling back to the Phase 1 placeholder strings) and set `variableKey`. This is initial-content seeding only — editing a `TEXT` layer's content does not write back to `ProjectVariable`, and changing a `ProjectVariable` does not re-sync already-persisted layers; both remain explicitly out of scope and documented as such.

- [ ] **Step 2: Write and fix the failing e2e journey**: open a seeded project's workspace, drag the hero board's image layer, edit a benefit's text, reload the page, assert the moved position and edited text persisted.

- [ ] **Step 3: Document Phase 2 scope** in `docs/development/phase-2.md` (completed / explicitly excluded / next boundary), following the Phase 1 doc's structure.

- [ ] **Step 4: Run the full verification suite** (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration`, `pnpm test:e2e`, `pnpm build`) and **commit**.

## Plan Self-Review

- Spec coverage: canvas core objects (画板/素材/设计元素 for text+shape+image-placeholder), basic object properties panel, initial content linkage from global variables. Explicitly deferred: AI result groups, candidate selection, workflow/node view, multi-object selection, undo/redo/version history, product-consistency checks, export, live variable re-sync after edit.
- Interface consistency: `ObjectLayer` is the single shape shared by normalization, rendering, the property panel, and the PATCH boundary; `Board.layers` remains the only persisted representation, so no schema migration is required.
- Testability risk called out explicitly: Konva's Node entry point cannot load in jsdom at all (it needs the native `canvas` package that browsers don't use) — addressed by mocking `react-konva` with DOM stubs for unit tests and a parallel accessible DOM summary so behavior stays verifiable without relying on canvas pixel output; true drag/resize interaction is verified in Playwright (Task 4), not jsdom.
- Placeholder scan: no unspecified implementation steps or undefined future interfaces inside this phase's boundary.
