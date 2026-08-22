import { test, expect } from "@playwright/test";
import { prisma, loginUrl } from "./helpers";

test.describe.configure({ mode: "serial" });

const MEMBER_NAME = "Tess Threadtest";
const MEMBER_EMAIL = `e2e-thread-${Date.now()}@example.test`;
let memberId = "";
let managerId = "";

test.beforeAll(async () => {
  const manager = await prisma.user.findFirstOrThrow({ where: { role: "MANAGER" } });
  managerId = manager.id;
  const member = await prisma.user.create({
    data: { email: MEMBER_EMAIL, name: MEMBER_NAME },
  });
  memberId = member.id;
});

test.afterAll(async () => {
  await prisma.threadMessage.deleteMany({
    where: { user: { email: { startsWith: "e2e-" } } },
  });
  await prisma.emailLog.deleteMany({ where: { toEmail: { startsWith: "e2e-" } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-" } } });
  await prisma.$disconnect();
});

test("manager sends a thread message from the contact record", async ({ page }) => {
  await page.goto(await loginUrl(managerId, `/admin/volunteers/${memberId}`));
  await expect(page.getByRole("heading", { name: "Conversation" })).toBeVisible();

  await page.getByPlaceholder(`Message Tess…`).fill("Hi Tess — can you take Saturday morning?");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("Hi Tess — can you take Saturday morning?")).toBeVisible();

  // The email went out through the outbox as a Direct message.
  await page.goto("/admin/messages");
  await expect(page.getByText(/Direct message:/).first()).toBeVisible();
});

test("member sees the unread badge, reads the thread, and replies in-app", async ({ page }) => {
  await page.goto(await loginUrl(memberId, "/shifts"));

  // The sidebar (a drawer on phones) shows Messages with an unread count.
  const openSidebar = () => page.getByRole("button", { name: /toggle sidebar/i }).click();
  await openSidebar();
  const messagesLink = page.getByRole("link", { name: /Messages/ });
  await expect(messagesLink).toBeVisible();
  await expect(messagesLink.locator("..")).toContainText("1");

  await messagesLink.click();
  await page.keyboard.press("Escape");
  await expect(page.getByText("Hi Tess — can you take Saturday morning?")).toBeVisible();

  // Viewing marked it read: the badge is gone.
  await page.goto("/shifts");
  await openSidebar();
  await expect(page.getByRole("link", { name: /Messages/ }).locator("..")).not.toContainText("1");
  await page.keyboard.press("Escape");

  // Reply in-app.
  await page.goto("/me/messages");
  await page.getByPlaceholder("Write to the volunteer manager…").fill("Yes! Sign me up.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Yes! Sign me up.")).toBeVisible();
});

test("manager sees the reply, unread badges, and the reply-notice email", async ({ page }) => {
  // Dashboard banner + volunteers list badge.
  await page.goto(await loginUrl(managerId, "/admin"));
  await expect(page.getByText(/1 unread message from volunteers/)).toBeVisible();
  await page.goto("/admin/volunteers");
  await expect(page.getByText(/💬 1 new/).first()).toBeVisible();

  // The thread shows the reply; viewing clears the badge. The clear is a server
  // action fired after mount, so wait for that POST to land before navigating away.
  const markedRead = page.waitForResponse((r) => r.request().method() === "POST" && r.ok());
  await page.goto(`/admin/volunteers/${memberId}`);
  await expect(page.getByText("Yes! Sign me up.")).toBeVisible();
  await markedRead;
  await page.goto("/admin/volunteers");
  await expect(page.getByText(/💬 1 new/)).toHaveCount(0);

  // The manager got a reply-notice email through the outbox.
  await page.goto("/admin/messages");
  await expect(page.getByText(/Reply notice:/).first()).toBeVisible();
});

test("simulated inbound email lands in the thread via reply-matching", async ({ page }) => {
  await page.goto(await loginUrl(managerId, "/admin/dev"));

  // Simulate an email reply correlated by In-Reply-To against the member's
  // latest app email (the same path real Gmail replies take; the unit tests
  // cover the mismatched-From variant).
  await page
    .getByLabel("From (a volunteer or board member's email)")
    .fill(MEMBER_EMAIL);
  await page.getByLabel("Message").fill("Replying straight from my mail app!");
  await page.getByText("Send as a reply to their latest email").click();
  await page.getByRole("button", { name: "Simulate email" }).click();
  await expect(page.getByText(/Ingested into Tess Threadtest's conversation/)).toBeVisible();

  await page.goto(`/admin/volunteers/${memberId}`);
  await expect(page.getByText("Replying straight from my mail app!")).toBeVisible();
  await expect(page.getByText("via email").first()).toBeVisible();
});
