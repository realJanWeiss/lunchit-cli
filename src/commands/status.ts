import { defineCommand } from "citty";

import { loadSession } from "../config.ts";

export default defineCommand({
  meta: {
    name: "status",
    description: "Show login status",
  },
  async run() {
    const session = await loadSession();
    if (!session) {
      console.log("Not logged in.");
      return;
    }

    console.log(`Logged in as ${session.email}`);
  },
});
