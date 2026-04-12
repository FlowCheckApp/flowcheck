# FlowCheck AI Copilot — Integration Guide

## What you got

- `api/copilot.js` → Drop into your `/api/` folder (Vercel serverless function)
- `js/app-copilot.js` → Drop into your `/js/` folder (client module)

---

## Step 1 — Add the Anthropic API key to Vercel

In your Vercel dashboard → flowcheck project → Settings → Environment Variables:

```
ANTHROPIC_API_KEY = sk-ant-...your key here...
```

Set it for Production + Preview environments.

---

## Step 2 — Add the script to your HTML

In your main `index.html`, after `app-auth.js` and before the closing `</body>`:

```html
<script src="/js/app-copilot.js"></script>
```

---

## Step 3 — Add the feed container to your dashboard page

Find your `#pg-dashboard` section in your HTML and add this div
where you want the copilot feed to appear (ideally near the top, above the stat chips):

```html
<div id="copilot-feed" style="margin-bottom:20px"></div>
```

That's it. The script auto-initializes when the DOM is ready.

---

## Step 4 — Free vs Premium gating

The API already handles this. Free users get 1 card + an upsell prompt.
Premium users get the full 4-6 card briefing.

The check uses your existing `isPremium()` function — make sure it's
defined before `app-copilot.js` loads, or the copilot defaults to free tier.

---

## How caching works

- Briefings are cached in localStorage for 4 hours (`fc-copilot-cache`)
- The "↻ Refresh" button clears cache and re-fetches immediately
- On app open, the cached version renders instantly while a background
  refresh runs if cache is stale

---

## Card data sources

The copilot reads from your existing global variables automatically:
- `budgets` → budget categories + spending
- `debts` → debt balances + APR + due dates
- `bills` → upcoming bill amounts + due days
- `savings` → savings goals
- `logList` → recent transactions
- `plaidLinkedAccounts` → account balances
- `calcNetWorth()` → net worth (if function exists)

No changes needed to your existing data layer.

---

## Refresh copilot after data changes

If you want the copilot to re-fetch after a Plaid sync or major data
change, call this anywhere in your existing code:

```js
if (typeof clearCopilotCache === 'function') {
  clearCopilotCache();
  fetchCopilotCards(true);
}
```

A good place: inside your `_importPlaidTxns` success handler in app-plaid.js,
after a successful sync that added new transactions.

---

## Estimated API cost

~$0.003–0.008 per briefing generation (Claude Sonnet, ~2k tokens)
With 4hr cache: ~$0.015–0.04/user/day if they open the app ~5x
At 1,000 premium users ($4/mo avg): AI costs ~$45–120/month
Revenue at 1,000 users: ~$4,000/month
AI cost as % of revenue: ~1–3% ✅
