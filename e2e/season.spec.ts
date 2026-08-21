import { test, expect, type Page } from "@playwright/test";
import { prisma, loginUrl } from "./helpers";

test.describe.configure({ mode: "serial" });

const VOLUNTEER_NAME = "Evie Endtoend";
const VOLUNTEER_EMAIL = `e2e-${Date.now()}@example.test`;
const SHOT_DIR =
  process.env.E2E_SHOT_DIR ?? "/tmp/claude-0/-home-user-ai-tedx-savannah-volunteers/a36f31bf-d479-50ca-bf40-2e3f826f9786/scratchpad/shots";

async function backToRealTime() {
  await prisma.settings.update({ where: { id: 1 }, data: { simulatedNow: null } });
}

test.beforeAll(async () => {
  await backToRealTime();
});

test.afterAll(async () => {
  await backToRealTime();
  await prisma.signup.deleteMany({ where: { user: { email: { startsWith: "e2e-" } } } });
  await prisma.emailLog.deleteMany({ where: { toEmail: { startsWith: "e2e-" } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-" } } });
  await prisma.shift.deleteMany({ where: { title: "Coffee Runner E2E" } });
  await prisma.$disconnect();
});

function shiftCard(page: Page, title: string) {
  // Shift rows are <article>s on the board and <Card>s on My Shifts.
  return page
    .locator("article, div.rounded-lg")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

test("volunteer joins, signs up (capacity updates), and cancels with a reason", async ({
  page,
}) => {
  await page.goto("/join");
  await page.getByLabel("Your name").fill(VOLUNTEER_NAME);
  await page.getByLabel("Email").fill(VOLUNTEER_EMAIL);
  await page.getByRole("button", { name: "Join the volunteer crew" }).click();

  await expect(page).toHaveURL(/\/shifts/);
  await expect(page.getByText("You're in.")).toBeVisible();

  // Sign up for Swag Bag Stuffing (seeded at 3 of 6 filled).
  const card = shiftCard(page, "Swag Bag Stuffing");
  await expect(card.getByText("3 spots left")).toBeVisible();
  await card.getByRole("button", { name: "Sign up" }).click();
  await expect(card.getByText("You're signed up")).toBeVisible();
  await expect(card.getByText("2 spots left")).toBeVisible();

  // A full shift offers the waitlist instead.
  const full = shiftCard(page, "Green Room Support");
  await expect(full.getByRole("button", { name: "Join waitlist" })).toBeVisible();

  await page.screenshot({ path: `${SHOT_DIR}/volunteer-shifts.png`, fullPage: false });

  // Cancel from My Shifts, with a reason.
  await page.goto("/me");
  const mine = shiftCard(page, "Swag Bag Stuffing");
  await expect(mine).toBeVisible();
  await mine.getByRole("button", { name: "Cancel" }).click();
  await page
    .getByPlaceholder(/Schedule conflict/)
    .fill("So sorry — jury duty came up that week!");
  await page.getByRole("button", { name: "Yes, cancel" }).click();
  // The shift disappears from My Shifts once the cancellation lands.
  await expect(shiftCard(page, "Swag Bag Stuffing")).toHaveCount(0);
  await expect(page.getByText("You're not signed up for any upcoming shifts")).toBeVisible();
});

test("manager: cancellation feed, custom-time shift, time travel, reminders, check-in", async ({
  page,
}) => {
  const manager = await prisma.user.findFirst({ where: { role: "MANAGER" } });
  expect(manager).not.toBeNull();

  // One-click sign-in exactly like an email deep link.
  await page.goto(await loginUrl(manager!.id, "/admin"));
  await expect(page).toHaveURL(/\/admin/);

  // The volunteer's cancellation (with note) is on the dashboard feed.
  await expect(page.getByRole("heading", { name: "Recent cancellations" })).toBeVisible();
  await expect(page.getByText(VOLUNTEER_NAME).first()).toBeVisible();
  await expect(page.getByText("jury duty came up").first()).toBeVisible();

  // Create a shift with a custom (non-slot) time.
  await page.goto("/admin/shifts/new");
  await page.getByLabel("Shift title").fill("Coffee Runner E2E");
  await page.getByRole("button", { name: "Custom time" }).click();
  await page.locator('input[name="startsAt"]').fill("2027-05-14T09:30");
  await page.locator('input[name="endsAt"]').fill("2027-05-14T11:30");
  await page.getByLabel("Volunteers needed").fill("3");
  await page.getByRole("button", { name: "Create shift" }).click();
  await expect(page).toHaveURL(/\/admin\/shifts$/);
  await expect(page.getByText("Coffee Runner E2E")).toBeVisible();

  // Time travel to May 12 (T-3) and fire the scheduler.
  await page.goto("/admin/dev");
  await page.getByRole("button", { name: /May 12, 2027/ }).click();
  await expect(page.getByTestId("time-travel-banner")).toBeVisible();
  await page.getByRole("button", { name: "Clear reminder history" }).click();
  await expect(page.getByText(/Cleared \d+ reminder/)).toBeVisible();
  await page.getByRole("button", { name: "▶ Run scheduler" }).click();
  await expect(page.getByText(/Queued [1-9]\d* reminders?/)).toBeVisible();

  // The reminder emails are in the outbox.
  await page.goto("/admin/messages");
  await expect(page.getByText(/Reminder:/).first()).toBeVisible();

  // Jump to event morning and run check-in.
  await page.goto("/admin/dev");
  await page.getByRole("button", { name: /May 15, 2027/ }).click();
  await page.goto("/admin/checkin");
  await expect(page.getByText(/0 of \d+ here/)).toBeVisible();
  await page.getByRole("button", { name: "Check in" }).first().click();
  await expect(page.getByText(/1 of \d+ here/)).toBeVisible();
  await expect(page.getByRole("button", { name: "✓ Here" }).first()).toBeVisible();

  await page.screenshot({ path: `${SHOT_DIR}/event-day-checkin.png`, fullPage: false });

  // Back to real time.
  await page.goto("/admin/dev");
  await page.getByRole("button", { name: "← Back to real time" }).click();
  await expect(page.getByTestId("time-travel-banner")).toHaveCount(0);
});
