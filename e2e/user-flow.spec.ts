import { expect, test } from "@playwright/test";

const registrationEmail = process.env.E2E_EMAIL;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

test.describe("注册用户流程", () => {
  test.skip(!registrationEmail, "需要 E2E_EMAIL 与运行中的 Mailpit/测试数据库");

  test("注册后进入邮箱验证提示", async ({ page }, testInfo) => {
    const separator = registrationEmail!.lastIndexOf("@");
    const uniqueEmail = separator > 0
      ? `${registrationEmail!.slice(0, separator)}+${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}${registrationEmail!.slice(separator)}`
      : registrationEmail!;
    await page.goto("/register");
    await page.getByLabel("用户名").fill(`端到端${Date.now()}`.slice(0, 20));
    await page.getByLabel("邮箱").fill(uniqueEmail);
    await page.getByLabel("密码", { exact: true }).fill("TestPass123!");
    await page.getByLabel("确认密码").fill("TestPass123!");
    await page.getByText("我同意用户协议和隐私政策").click();
    await page.getByRole("button", { name: "注册并发送验证邮件" }).click();
    await expect(page).toHaveURL(/verify-email/);
  });
});

test.describe("管理员流程", () => {
  test.skip(!adminEmail || !adminPassword, "需要管理员 E2E 凭据");

  test("登录后访问用户、内容和学年管理", async ({ page }, testInfo) => {
    await page.goto("/login");
    await page.getByLabel("用户名或邮箱").fill(adminEmail!);
    await page.getByLabel("密码").fill(adminPassword!);
    await page.getByRole("button", { name: "登录" }).click();
    await expect(page).toHaveURL(/\/me$/);

    await page.goto("/admin/users");
    await expect(page.getByRole("heading", { name: "用户管理" })).toBeVisible();
    const userChoices = page.getByRole("checkbox", { name: /^选择用户 / });
    await expect(userChoices.first()).toBeEnabled();
    await userChoices.first().check();
    await expect(page.getByRole("button", { name: "批量删除" })).toBeEnabled();
    await userChoices.first().uncheck();

    await page.goto("/admin/knowledge");
    const documentTitle = `【E2E临时资料】${testInfo.project.name}-${Date.now()}`;
    await page.getByRole("textbox", { name: "标题", exact: true }).fill(documentTitle);
    await page.getByRole("textbox", { name: "来源", exact: true }).fill("Playwright 自动测试");
    await page.getByRole("button", { name: "粗体", exact: true }).click();
    await page.getByRole("textbox", { name: "正文", exact: true }).fill("**这是一段用于验证知识库删除的临时正文。**");
    await page.getByRole("button", { name: "保存并切分" }).click();
    const documentCard = page.getByRole("article").filter({ hasText: documentTitle });
    await expect(documentCard).toBeVisible();
    page.once("dialog", (dialog) => dialog.accept());
    await documentCard.getByRole("button", { name: "删除资料" }).click();
    await expect(documentCard).toHaveCount(0);

    await page.goto("/admin/academic-year");
    await expect(page.getByLabel("开始日期")).toHaveValue(/\d{4}-\d{2}-\d{2}/);
    await expect(page.getByLabel("结束日期")).toHaveValue(/\d{4}-\d{2}-\d{2}/);

    await page.goto("/me/questions");
    await expect(page.getByRole("link", { name: "我的提问", exact: true })).toHaveAttribute("aria-current", "page");

    await page.goto("/admin/audit-logs");
    await expect(page.getByRole("heading", { name: "操作日志" })).toBeVisible();
  });
});
