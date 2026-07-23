# lunchit-cli (unofficial)

Simple CLI for uploading and managing receipts on [Lunchit](https://web.lunchit.com).

command | description
--- | ---
login | Log in to Lunchit
upload | Upload a receipt image
logout | Clear stored credentials
status | Show login status
receipts | List receipts for a month

## Setup

```bash
bun install
```

## Usage

Log in (credentials are stored in `~/.lunchit-cli/config.json`):

```bash
bun start login --email you@example.com --password secret
```

Upload a receipt image:

```bash
bun start upload ./receipt.png
```

Optional receipt metadata:

```bash
bun start upload ./receipt.png \
  --date 2026-06-24 \
  --store-name "billa ag" \
  --city wien \
  --street "am europlatz 2" \
  --zip 1120
```

Submit as a restaurant receipt (defaults to supermarket):

```bash
bun start upload ./receipt.png --restaurant
```

List receipts for the current month:

```bash
bun start receipts
```

Fetch receipts for a specific year and month:

```bash
bun start receipts --year 2026 --month 6
```

Use `--help` on any command for usage details, e.g. `bun start upload --help`.

You can also set `LUNCHIT_EMAIL` and `LUNCHIT_PASSWORD` instead of passing flags.
