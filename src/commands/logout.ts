import { defineCommand } from "citty";

import { clearSession } from "../config.ts";

export default defineCommand({
  meta: {
    name: "logout",
    description: "Clear stored credentials",
  },
  async run() {
    await clearSession();
    console.log("Logged out.");
  },
});
