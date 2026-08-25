import { render } from "@testing-library/react";
import RootLayout from "@/app/layout";

test("shows the four primary product areas", () => {
  const view = render(<RootLayout><main>内容</main></RootLayout>, {
    container: document as unknown as HTMLElement,
  });
  for (const label of ["模板", "项目", "素材", "品牌"]) {
    expect(view.getByRole("link", { name: label })).toBeInTheDocument();
  }
});
