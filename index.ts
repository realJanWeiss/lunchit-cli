import { defineCommand, runMain } from "citty";

const main = defineCommand({
  meta: {
    name: "lunchit",
    version: "1.0.0",
    description: "Upload and manage Lunchit receipts",
  },
  subCommands: {
    login: () => import("./src/commands/login.ts").then((m) => m.default),
    upload: () => import("./src/commands/upload.ts").then((m) => m.default),
    logout: () => import("./src/commands/logout.ts").then((m) => m.default),
    status: () => import("./src/commands/status.ts").then((m) => m.default),
  },
});

runMain(main);
