import { defineCommand } from "citty";

import { login } from "../api.ts";
import { saveSession } from "../config.ts";
import { promptLine } from "../utils.ts";

export default defineCommand({
  meta: {
    name: "login",
    description: "Log in to Lunchit",
  },
  args: {
    email: {
      type: "string",
      description: "Account email (or set LUNCHIT_EMAIL)",
      valueHint: "email",
    },
    password: {
      type: "string",
      description: "Account password (or set LUNCHIT_PASSWORD)",
      valueHint: "password",
    },
  },
  async run({ args }) {
    const email = args.email ?? process.env.LUNCHIT_EMAIL ?? (await promptLine("Email: "));
    const password =
      args.password ?? process.env.LUNCHIT_PASSWORD ?? (await promptLine("Password: "));

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const tokens = await login(email, password);
    await saveSession({
      email,
      sessionToken: tokens.sessionToken,
      refreshToken: tokens.refreshToken,
    });

    console.log(`Logged in as ${email}`);
  },
});
