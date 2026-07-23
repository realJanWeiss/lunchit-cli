import { defineCommand } from "citty";

import { submitReceipt, uploadReceiptDocument } from "../api.ts";
import { loadSession } from "../config.ts";
import { todayIsoDate } from "../utils.ts";

export default defineCommand({
  meta: {
    name: "upload",
    description: "Upload a receipt image",
  },
  args: {
    image: {
      type: "positional",
      description: "Path to the receipt image",
      required: true,
    },
    date: {
      type: "string",
      description: "Receipt date",
      default: todayIsoDate(),
      valueHint: "YYYY-MM-DD",
    },
    storeName: {
      type: "string",
      description: "Store name",
      valueHint: "name",
    },
    city: {
      type: "string",
      description: "City",
    },
    street: {
      type: "string",
      description: "Street and number",
    },
    zip: {
      type: "string",
      description: "Zip code",
    },
    restaurant: {
      type: "boolean",
      description: "Submit as a restaurant receipt (default: supermarket)",
      default: false,
    },
  },
  async run({ args }) {
    const session = await loadSession();
    if (!session) {
      throw new Error("Not logged in. Run `lunchit login` first.");
    }

    console.log(`Uploading ${args.image}...`);
    const upload = await uploadReceiptDocument(session.sessionToken, args.image);
    console.log(`Document uploaded (${upload.receiptId})`);

    const receipt = await submitReceipt(session.sessionToken, {
      receiptId: upload.receiptId,
      date: args.date,
      restaurant: args.restaurant,
      storeName: args.storeName,
      city: args.city,
      streetAndNumber: args.street,
      zipCode: args.zip,
    });

    console.log("Receipt submitted:");
    console.log(JSON.stringify(receipt, null, 2));
  },
});
