import { render, screen } from "@testing-library/react";
import RootLayout from "@/app/layout";

test("shows the four primary product areas", () => {
  render(<RootLayout><main>内容</main></RootLayout>);
  for (const label of ["模板", "项目", "素材", "品牌"]) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
});
