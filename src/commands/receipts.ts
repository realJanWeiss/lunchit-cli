import { defineCommand } from "citty";

import { fetchReceiptGroups, receiptCategory } from "../api.ts";
import { ensureValidSession } from "../session.ts";
import { currentMonth, currentYear, formatTable, twoLetterWeekday } from "../utils.ts";

export default defineCommand({
  meta: {
    name: "receipts",
    description: "List receipts for a month",
  },
  args: {
    year: {
      type: "string",
      description: "Year to fetch",
      default: String(currentYear()),
      valueHint: "YYYY",
    },
    month: {
      type: "string",
      description: "Month to fetch (1-12)",
      default: String(currentMonth()),
      valueHint: "1-12",
    },
  },
  async run({ args }) {
    const session = await ensureValidSession();

    const year = Number.parseInt(args.year, 10);
    const month = Number.parseInt(args.month, 10);

    if (!Number.isInteger(year) || year < 2000) {
      throw new Error("Invalid year. Expected a four-digit year, e.g. 2026.");
    }
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Invalid month. Expected a number between 1 and 12.");
    }

    const groups = await fetchReceiptGroups(session.sessionToken, year, month);

    if (groups.length === 0) {
      console.log(`No receipts for ${year}-${String(month).padStart(2, "0")}.`);
      return;
    }

    const rows = groups.map((group) => {
      const typeId = group.receipts[0]?.typeId ?? 0;
      return [
        twoLetterWeekday(group.date),
        group.date,
        receiptCategory(typeId),
        group.refundAmount.toFixed(2),
      ];
    });

    console.log(formatTable(["Day", "Date", "Category", "Refund"], rows, { alignRight: [3] }));
  },
});
