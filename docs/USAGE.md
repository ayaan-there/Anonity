# How to Use Anonity

A plain-English guide for using the Anonity bounty board on Midnight Preprod. No blockchain experience required.

---

## What You Need

- **A Midnight wallet** in your browser:
  - **Lace wallet** — the standard Midnight browser extension, or
  - **1AM wallet** — recommended: proofs run inside your browser, no extra setup
- **Preprod tNIGHT tokens** — testnet-only funds (never real money). If you use Lace and have no dust yet, generate DUST from Lace → Tokens before transacting.
- That's it. **No account, no email, no name** — your identity is a random secret key that never leaves your machine.

---

## Step-by-Step Guide

### 1. Open the app

Go to the live demo link (see README). The site runs entirely in your browser.

### 2. Connect your wallet

Click **CONNECT WALLET**, pick your wallet (1AM is preferred when installed), and approve the connection prompt. Your address appears in the header.

### 3. Post a bounty (organizations)

In the **ANONITY BOUNTY BOARD** section:

1. Find the **POST BOUNTY** panel.
2. Enter a deadline. Individual report payouts are chosen in NIGHT after triage.
3. Click **POST** and approve the transaction in your wallet.
4. Your bounty appears in the table with status **OPEN**.

On-chain, your identity is stored only as an anonymous commitment — nobody can tell which wallet posted the bounty.

### 4. Submit a report (hunters / researchers)

Found something? You don't need anyone's permission:

1. In **SUBMIT REPORT**, pick an open bounty from the dropdown.
2. Click **SUBMIT** and approve the transaction.
3. A 5 NIGHT anti-spam fee moves into the contract escrow. Your wallet must hold 5 NIGHT plus DUST for transaction fees. The contract records whether the fee is refundable or forfeited; an anonymous shielded refund transfer is still pending, so the fee remains in contract custody in this MVP.

The chain records that *a* qualified submission exists. It never learns who you are or links you to other reports.

After submitting, open **INBOX** to see your report and any messages from the program's triage team. Report contents and messages are visible only to you and the organization that owns the program.

> **Note:** report contents stay off-chain. Share details through your existing secure channel; the chain handles proof-of-submission and payment rights.

### 5. Resolve submissions (organizations)

When triage decides an outcome:

1. In **RESOLVE**, pick a pending submission.
2. Choose the outcome:
   - **Valid** — bounty marked paid, refund recorded, bounty closes
   - **Duplicate** — refund recorded, bounty stays open
   - **Slop** — fee forfeited to contract custody
3. Click **RESOLVE** and approve the transaction.

Only the organization that posted the bounty can resolve its submissions — this authority is enforced by a zero-knowledge proof, not by addresses.

To contact a researcher, open the report from your dashboard and use the **TRIAGE THREAD** message box. The message appears in the researcher's Inbox without exposing their identity.

### 6. Watch the board

Click **REFRESH BOARD** any time to re-read the latest state from the Midnight indexer. The stats bar shows live fee accounting: escrowed, forfeited, refunded, and paid out.

---

## What Gets Proved (and What Stays Private)

| The chain can see | Nobody can see |
|---|---|
| That a bounty exists (amount, deadline) | Which wallet posted it |
| That a submission was made | Who submitted it |
| The outcome of each submission | Any wallet↔identity link |
| Fee totals (escrowed/forfeited/refunded/paid) | The org or hunter secret keys |

**How?** Each participant holds a random 32-byte secret key locally. Circuits derive a one-way commitment from it and prove statements about it inside a zero-knowledge proof:

- Hunters prove "I'm submitting honestly" without revealing who they are.
- Orgs prove "I own this bounty" when resolving — without revealing which bounty poster they are.
- Secret keys never appear in the UI, the network traffic, or anywhere on-chain.

---

## Troubleshooting

**"No compatible Midnight wallet detected"**
Install the Lace or 1AM extension, then reload the page.

**"Network mismatch"**
Your wallet is on the wrong network. Switch it to **Preprod** and reconnect.

**Transaction stuck or fails with a dust error**
Lace users need local DUST to pay fees. Run the local proof server (`npm run proof-server:start`) and generate DUST from Lace → Tokens. 1AM users get fees sponsored automatically.

**"Circuit failed" errors after long idle**
The indexer may be momentarily behind. Wait ~30 seconds and click REFRESH BOARD, then retry.

**I lost my secrets**
Treat them like passwords — for the Preprod demo they're regenerable, but in production they ARE your identity. There is no reset email in a zero-knowledge system.
