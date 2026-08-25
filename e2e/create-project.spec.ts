import { expect, test } from "@playwright/test";

test("从通用商品上新套装创建五画板项目", async ({ page }) => {
  await page.goto("/templates");

  const templateCard = page.locator("article").filter({
    has: page.getByRole("heading", { name: "通用商品上新套装" }),
  });
  await templateCard.getByRole("link", { name: "查看模板详情" }).click();
  await page.getByRole("link", { name: "用此模板创作" }).click();

  await page.getByLabel("商品名称").fill("咖啡机");
  await page.getByLabel("商品类目").fill("家电");
  await page.getByLabel("商品图片地址").fill("https://example.com/coffee-machine.jpg");
  await page.getByRole("button", { name: "下一步" }).click();

  await page.getByLabel("卖点 1").fill("快速加热");
  await page.getByLabel("卖点 2").fill("精准控温");
  await page.getByLabel("卖点 3").fill("容易清洁");
  await page.getByRole("button", { name: "下一步" }).click();

  await page.getByLabel("使用场景").fill("现代厨房");
  await expect(page.getByRole("combobox", { name: "视觉风格" })).toHaveValue("MINIMAL");
  await expect(page.getByLabel("主色")).toHaveValue("#18181b");
  await expect(page.getByRole("radio", { name: "1 个候选" })).toBeChecked();
  await page.getByRole("button", { name: "生成整套素材" }).click();

  await expect(page).toHaveURL(/\/projects\/[^/]+$/);
  await expect(page.getByRole("heading", { name: /咖啡机/ })).toBeVisible();
  await expect(page.getByTestId("marketing-board")).toHaveCount(5);
  for (const benefit of ["快速加热", "精准控温", "容易清洁"]) {
    await expect(page.getByText(benefit, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("等待 AI 生成").first()).toBeVisible();
});
