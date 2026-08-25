import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import TemplateDetailPage from "@/app/templates/[slug]/page";
import { CreateProjectWizard } from "@/components/wizard/create-project-wizard";
import { DirectionStep } from "@/components/wizard/direction-step";
import { MarketingStep } from "@/components/wizard/marketing-step";
import { getPublishedTemplate } from "@/lib/templates/get-template";

const { notFound, push } = vi.hoisted(() => ({ notFound: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  notFound,
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/templates/get-template", () => ({
  getPublishedTemplate: vi.fn(),
}));

const mockedGetPublishedTemplate = vi.mocked(getPublishedTemplate);

afterEach(() => {
  mockedGetPublishedTemplate.mockReset();
  notFound.mockReset();
  push.mockReset();
  vi.unstubAllGlobals();
});

function fillProductStep() {
  fireEvent.change(screen.getByLabelText("商品名称"), { target: { value: " 保温杯 " } });
  fireEvent.change(screen.getByLabelText("商品类目"), { target: { value: " 家居用品 " } });
  fireEvent.change(screen.getByLabelText("商品图片地址"), {
    target: { value: "https://cdn.example.com/product.png" },
  });
  fireEvent.click(screen.getByRole("button", { name: "下一步" }));
}

function fillMarketingStep() {
  fireEvent.change(screen.getByLabelText("卖点 1"), { target: { value: " 轻巧便携 " } });
  fireEvent.change(screen.getByLabelText("卖点 2"), { target: { value: " 12 小时保温 " } });
  fireEvent.change(screen.getByLabelText("卖点 3"), { target: { value: " 食品级不锈钢 " } });
  fireEvent.change(screen.getByLabelText("价格"), { target: { value: " 199 元 " } });
  fireEvent.change(screen.getByLabelText("促销信息"), { target: { value: " 限时九折 " } });
  fireEvent.change(screen.getByLabelText("品牌名称"), { target: { value: " 山岚 " } });
  fireEvent.click(screen.getByRole("button", { name: "下一步" }));
}

function fillDirectionStep() {
  fireEvent.change(screen.getByLabelText("视觉风格"), { target: { value: "PREMIUM" } });
  fireEvent.change(screen.getByLabelText("使用场景"), { target: { value: " 通勤办公桌 " } });
  fireEvent.change(screen.getByLabelText("主色"), { target: { value: "#112233" } });
  fireEvent.click(screen.getByLabelText("4 个候选"));
}

function reachDirectionStep() {
  fillProductStep();
  fillMarketingStep();
  fillDirectionStep();
}

test("starts on the accessible product step", () => {
  render(<CreateProjectWizard templateVersionId="version-1" />);

  expect(screen.getByText("第 1 步，共 3 步")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "商品信息" })).toBeInTheDocument();
  expect(screen.getByLabelText("商品名称")).toBeInTheDocument();
});

test("shows and associates a root benefits error with every benefit input", () => {
  render(
    <MarketingStep
      value={{
        benefits: ["轻巧", "保温", "耐用"],
        price: "",
        promotion: "",
        brandName: "",
      }}
      errors={{ benefits: "请填写恰好三个卖点" }}
      onBenefitChange={vi.fn()}
      onChange={vi.fn()}
    />,
  );

  expect(screen.getByText("请填写恰好三个卖点")).toHaveAttribute("id", "benefits-error");
  for (const label of ["卖点 1", "卖点 2", "卖点 3"]) {
    expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText(label)).toHaveAttribute("aria-describedby", "benefits-error");
  }
});

test("shows and associates style and candidate count errors", () => {
  render(
    <DirectionStep
      value={{
        style: "MINIMAL",
        scene: "办公桌",
        primaryColor: "#112233",
        candidateCount: 1,
      }}
      errors={{
        style: "请选择简约、生活方式或高端质感风格",
        candidateCount: "候选数量必须为 1、2 或 4",
      }}
      onChange={vi.fn()}
    />,
  );

  const style = screen.getByRole("combobox", { name: "视觉风格" });
  expect(style).toHaveAttribute("aria-invalid", "true");
  expect(style).toHaveAttribute("aria-describedby", "direction-style-error");
  expect(screen.getByText("请选择简约、生活方式或高端质感风格")).toHaveAttribute(
    "id",
    "direction-style-error",
  );

  const candidate = screen.getByRole("radio", { name: "1 个候选" });
  expect(candidate).toHaveAttribute("aria-invalid", "true");
  expect(candidate).toHaveAttribute("aria-describedby", "direction-candidate-count-error");
  expect(screen.getByText("候选数量必须为 1、2 或 4")).toHaveAttribute(
    "id",
    "direction-candidate-count-error",
  );
});

test("renders the wizard with the published template version when create mode is requested", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ project: { id: "p1" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  mockedGetPublishedTemplate.mockResolvedValue({
    id: "template-1",
    slug: "general-product-launch",
    name: "通用商品上新套装",
    description: "一次生成五张营销素材",
    coverUrl: "/templates/general.webp",
    boardCount: 5,
    templateVersionId: "real-version-id",
    requiredInputs: [],
    workflowSteps: [],
    boards: [],
    estimatedMinutes: 5,
    versionRequirement: "专业版",
  });

  const page = await TemplateDetailPage({
    params: Promise.resolve({ slug: "general-product-launch" }),
    searchParams: Promise.resolve({ create: "1" }),
  });
  render(page);

  expect(screen.getByRole("heading", { name: "创建通用商品上新套装" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "商品信息" })).toBeInTheDocument();

  reachDirectionStep();
  fireEvent.click(screen.getByRole("button", { name: "生成整套素材" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  const request = fetchMock.mock.calls[0][1] as RequestInit;
  expect(JSON.parse(request.body as string)).toMatchObject({ templateVersionId: "real-version-id" });
});

test("collects all three steps, posts normalized JSON, and navigates to the created project", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ project: { id: "p1" } }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(<CreateProjectWizard templateVersionId="version-1" />);

  fillProductStep();
  expect(screen.getByText("第 2 步，共 3 步")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "营销信息" })).toBeInTheDocument();

  fillMarketingStep();
  expect(screen.getByText("第 3 步，共 3 步")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "视觉方向" })).toBeInTheDocument();

  fillDirectionStep();
  fireEvent.click(screen.getByRole("button", { name: "生成整套素材" }));

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateVersionId: "version-1",
        product: {
          name: "保温杯",
          category: "家居用品",
          sourceImageUrl: "https://cdn.example.com/product.png",
        },
        marketing: {
          benefits: ["轻巧便携", "12 小时保温", "食品级不锈钢"],
          price: "199 元",
          promotion: "限时九折",
          brandName: "山岚",
        },
        direction: {
          style: "PREMIUM",
          scene: "通勤办公桌",
          primaryColor: "#112233",
          candidateCount: 4,
        },
      }),
    }),
  );
  expect(push).toHaveBeenCalledWith("/projects/p1");
});

test("does not advance while the current step is invalid", () => {
  render(<CreateProjectWizard templateVersionId="version-1" />);

  fireEvent.click(screen.getByRole("button", { name: "下一步" }));

  expect(screen.getByText("第 1 步，共 3 步")).toBeInTheDocument();
  expect(screen.getAllByText("此项不能为空").length).toBeGreaterThan(0);
  expect(screen.queryByRole("heading", { name: "营销信息" })).not.toBeInTheDocument();
});

test("shows a Chinese error and restores the button after a non-success response", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
  render(<CreateProjectWizard templateVersionId="version-1" />);
  reachDirectionStep();

  fireEvent.click(screen.getByRole("button", { name: "生成整套素材" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("创建项目失败，请稍后重试。");
  expect(screen.getByRole("button", { name: "生成整套素材" })).toBeEnabled();
  expect(push).not.toHaveBeenCalled();
});

test("rejects a successful response that does not contain a project id", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ project: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  render(<CreateProjectWizard templateVersionId="version-1" />);
  reachDirectionStep();

  fireEvent.click(screen.getByRole("button", { name: "生成整套素材" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("创建项目失败，请稍后重试。");
  expect(push).not.toHaveBeenCalled();
});

test("disables the submit button while the request is pending", async () => {
  let resolveFetch!: (response: Response) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    ),
  );
  render(<CreateProjectWizard templateVersionId="version-1" />);
  reachDirectionStep();

  fireEvent.click(screen.getByRole("button", { name: "生成整套素材" }));

  expect(screen.getByRole("button", { name: "正在生成…" })).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("正在创建项目");

  resolveFetch(
    new Response(JSON.stringify({ project: { id: "p1" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  await waitFor(() => expect(push).toHaveBeenCalledWith("/projects/p1"));
});
