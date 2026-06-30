# Publix Sub of the Week → Discord

Posts the current week's [pubsub.sale](https://www.pubsub.sale/) deal(s) to a
Discord channel as a plain text message, automatically, every week. No
always-on bot process required — it runs on a schedule via GitHub Actions.

It's safe to run more than once: it tracks the last week it posted in
`state.json` and skips re-posting if nothing's new yet. That's intentional —
pubsub.sale's site updates "on Wednesday" but not at a guaranteed exact time,
so the workflow checks hourly through the day and only posts once it sees
new data.

## Setup (5 minutes)

### 1. Create a Discord webhook
In the Discord channel you want the updates posted to:
`Channel Settings → Integrations → Webhooks → New Webhook` → copy the
**Webhook URL**.

### 2. Put this code in a GitHub repo
Create a new repo and push these files to it (or use GitHub's "upload files"
in the browser if you don't want to use git locally).

### 3. Add the webhook URL as a secret
In the repo: `Settings → Secrets and variables → Actions → New repository secret`
- Name: `DISCORD_WEBHOOK_URL`
- Value: the webhook URL from step 1

### 4. Allow the workflow to commit
In the repo: `Settings → Actions → General → Workflow permissions` → select
**"Read and write permissions"** → Save.
(This lets the workflow update `state.json` after each successful post so it
doesn't repost the same week.)

### 5. Test it
Go to the **Actions** tab → "Post Weekly Publix Sub Deal" → **Run workflow**
(this is the `workflow_dispatch` trigger, for manual testing any day of the
week). Check your Discord channel for the message.

That's it — from here it runs automatically every Wednesday.

## Customizing

- **Message format:** edit `formatMessage()` in `post-weekly-deals.js`.
- **Schedule:** edit the `cron` line in
  `.github/workflows/weekly-post.yml`. Current schedule is hourly,
  9:00–23:00 UTC on Wednesdays. [crontab.guru](https://crontab.guru) is handy
  for adjusting this.
- **Run it yourself instead of GitHub Actions:** it's a plain Node script
  (Node 18+, no dependencies). Anywhere with a cron job works:
  ```
  DISCORD_WEBHOOK_URL="your-webhook-url" node post-weekly-deals.js
  ```

## How it decides what to post

It fetches `https://www.pubsub.sale/sub_deals_data.json`, finds the most
recent `week_start` across all listed deals, and posts every deal tagged
with that week (some weeks have just one sub, others have several, e.g. the
brisket sub family).
