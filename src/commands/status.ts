import { defineCommand } from "citty";

import { loadSession } from "../config.ts";
import { describeSessionStatus, formatExpiry } from "../session.ts";

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

    const status = describeSessionStatus(session);
    switch (status.kind) {
      case "valid":
        console.log(`Session valid until ${formatExpiry(status.sessionExpiresAt)}.`);
        if (status.refreshExpiresAt) {
          console.log(`Login valid until ${formatExpiry(status.refreshExpiresAt)}.`);
        }
        break;
      case "session_expired":
        console.log("Session expired (will refresh automatically on next command).");
        if (status.refreshExpiresAt) {
          console.log(`Login valid until ${formatExpiry(status.refreshExpiresAt)}.`);
        }
        break;
      case "login_expired":
        console.log("Login expired. Run `lunchit login` again.");
        break;
    }
  },
});
