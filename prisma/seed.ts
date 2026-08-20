/**
 * Seeds the database from the command line.
 *
 * Always: the manager account (MANAGER_EMAIL) and the settings row.
 * Unless SEED_DEMO=false: wipes and rebuilds the full demo season
 * (see src/lib/demo-data.ts).
 * SEED_DEMO=false SEED_WIPE=true: wipe everything except the manager —
 * the clean-slate reset before real volunteers start.
 *
 * The same actions are available in-app on Admin → Time travel, so a
 * terminal is never required.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import {
  ensureManagerAndSettings,
  wipeAllButManager,
  seedDemoSeason,
} from "../src/lib/demo-data";

const prisma = new PrismaClient();

const MANAGER_EMAIL = (process.env.MANAGER_EMAIL ?? "manager@example.com").toLowerCase().trim();
const MANAGER_NAME = process.env.MANAGER_NAME ?? "Volunteer Manager";
const SEED_DEMO = process.env.SEED_DEMO !== "false";
const SEED_WIPE = SEED_DEMO || process.env.SEED_WIPE === "true";

async function main() {
  const manager = await ensureManagerAndSettings(prisma, MANAGER_EMAIL, MANAGER_NAME);
  console.log(`Manager: ${manager.name} <${manager.email}>`);

  if (SEED_WIPE) {
    await wipeAllButManager(prisma, MANAGER_EMAIL);
  }

  if (!SEED_DEMO) {
    console.log(
      SEED_WIPE
        ? "Wiped all data except the manager account. Ready for real volunteers."
        : "SEED_DEMO=false — nothing changed beyond manager/settings."
    );
    return;
  }

  const counts = await seedDemoSeason(prisma, MANAGER_EMAIL);
  console.log("Seeded:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
