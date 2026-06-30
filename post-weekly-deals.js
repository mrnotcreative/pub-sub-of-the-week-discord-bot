// Posts the current week's Publix Sub of the Week deals to a Discord channel
// via webhook. Designed to run on a schedule (see .github/workflows) — safe
// to run multiple times since it skips posting if the current week was
// already posted.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_URL = 'https://www.pubsub.sale/sub_deals_data.json';
const STATE_FILE = path.join(__dirname, 'state.json');
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function main() {
  if (!WEBHOOK_URL) {
    throw new Error('Missing DISCORD_WEBHOOK_URL environment variable.');
  }

  const deals = await fetchDeals();
  const latestWeekStart = getLatestWeekStart(deals);
  const currentDeals = deals.filter((d) => d.week_start === latestWeekStart);

  const state = loadState();
  if (state.lastPostedWeek === latestWeekStart) {
    console.log(`Week of ${latestWeekStart} already posted. Skipping.`);
    return;
  }

  const message = formatMessage(latestWeekStart, currentDeals);
  await postToDiscord(message);

  saveState({ lastPostedWeek: latestWeekStart });
  console.log(`Posted ${currentDeals.length} deal(s) for week of ${latestWeekStart}.`);
}

async function fetchDeals() {
  const res = await fetch(DATA_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch deal data: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  const deals = json?.data?.raw_deals;
  if (!Array.isArray(deals) || deals.length === 0) {
    throw new Error('No deals found in API response.');
  }
  return deals;
}

function getLatestWeekStart(deals) {
  return deals.reduce(
    (latest, d) => (d.week_start > latest ? d.week_start : latest),
    deals[0].week_start
  );
}

function formatMessage(weekStart, deals) {
  const dateLabel = new Date(`${weekStart}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const lines = deals.map((d) => {
    const price = (d.price ?? 'N/A').replace(/^Starts at /, '');
    const sale = d.sale ? ` (${d.sale})` : '';
    return `• **${d.sub_name}** — ${price}${sale}`;
  });

  return [
    `🥪 **Publix Sub of the Week — ${dateLabel}**`,
    ...lines,
    `🔗 <https://www.pubsub.sale/>`,
  ].join('\n');
}

async function postToDiscord(content) {
  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord webhook failed: ${res.status} ${text}`);
  }
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { lastPostedWeek: null };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
