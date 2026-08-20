import { loadDotEnv } from "./env";

loadDotEnv();
// Tests must never send real email.
process.env.EMAIL_TRANSPORT = "console";
