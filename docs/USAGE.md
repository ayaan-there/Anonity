# How to Use Anonity

A plain-English guide for using the Anonity bounty board on Midnight Preprod. No blockchain experience required.

---

## What You Need

- **A Midnight wallet** in your browser:
  - **Lace wallet** — the standard Midnight browser extension, or
  - **1AM wallet** — recommended: proofs run inside your browser, no extra setup
- **Preprod tNIGHT tokens** — testnet-only funds (never real money). If you use Lace and have no dust yet, generate DUST from Lace → Tokens before transacting.
- That's it. **No hunter account, no email, no name** — your identity is a random secret key that never leaves your machine.

## Getting Started on Preprod

1. Open <https://an0n1ty.vercel.app/>.
2. Confirm the wallet is set to Midnight Preprod.
3. Connect Lace or 1AM and approve the request.
4. Leave the transaction-mode toggle beside Connect Wallet on Shielded. If your wallet lacks shielded NIGHT, select Unshielded and confirm the alert to use the testing fallback.
5. Use only testnet funds and never paste a secret key or recovery phrase into the app or a support message.

---

## Step-by-Step Guide

### 1. Open the app

Go to the live demo link (see README). The site runs entirely in your browser.

### 2. Create your hunter identity

Hunters create a local identity from the **HUNTER LOGIN** screen. Download the key backup immediately. Losing it means losing access to this identity and its encrypted Inbox; there is no recovery email.

### 3. Connect your wallet

Click **CONNECT WALLET**, pick your wallet (1AM is preferred when installed), and approve the connection prompt. Your address appears in the header.

### 4. Post a bounty (organizations)

In the **ANONITY BOUNTY BOARD** section:

1. Find the **POST BOUNTY** panel.
2. Enter a deadline. Individual report payouts are chosen in NIGHT after triage.
3. Click **POST** and approve the transaction in your wallet.
4. Your bounty appears in the table with status **OPEN**.

On-chain, your identity is stored only as an anonymous commitment — nobody can tell which wallet posted the bounty.

### 5. Submit a report (hunters / researchers)

Found something? You don't need anyone's permission:

1. In **SUBMIT REPORT**, pick an open bounty from the dropdown.
2. Click **SUBMIT** and approve the single shielded transaction. Your wallet must hold 5 NIGHT plus DUST for transaction fees.

The chain records that *a* qualified submission exists. It never learns who you are or links you to other reports.

After submitting, open **INBOX** to see your report and any messages from the program's triage team. This inbox is filtered locally from public on-chain submissions using your secret-derived commitment; it does not query Supabase by account. The report writer accepts ciphertext only after its Edge Function verifies a finalized `submitReport` transaction. Report contents and messages are visible only to you and the organization that owns the program.

The report is sealed in your browser twice: once to the program's public encryption key and once to a key derived from your local hunter secret. Supabase stores ciphertext only.

## Your First Transaction

The app opens in **Shielded** mode. Use the transaction-mode toggle beside **Connect Wallet** to choose the matching contract. If you switch to **Unshielded**, confirm the alert before continuing: that path is for testing with public NIGHT and is not anonymous. Return to **Shielded** whenever you want the privacy path.

Shielded transactions require shielded NIGHT and the required DUST. Unshielded transactions use public NIGHT and may expose the wallet and amount on-chain. The encrypted report body still leaves the browser only as ciphertext in either mode.

### 6. Resolve submissions (organizations)

When triage decides an outcome:

1. In **RESOLVE**, pick a pending submission.
2. Choose the outcome:
   - **Valid** — bounty marked paid, refund recorded, bounty closes
   - **Duplicate** — refund recorded, bounty stays open
   - **Slop** — fee forfeited to contract custody
3. For a valid report, enter the NIGHT amount. Click **VALID + PAY NIGHT** and approve the shielded funding transaction. Duplicate and slop resolutions do not require a payout amount.

Only the organization that posted the bounty can resolve its submissions — this authority is enforced by a zero-knowledge proof, not by addresses.

To contact a researcher, open the report from your dashboard and use the **TRIAGE THREAD** message box. The message appears in the researcher's Inbox without exposing their identity. The contract has the proof-gated claim circuit, but the current browser wallet connector still needs a qualified-coin selection flow before hunters can complete a payout claim from the UI.

### 7. Watch the board

Click **REFRESH BOARD** any time to re-read the latest state from the Midnight indexer. The stats bar shows live fee accounting: escrowed, forfeited, refunded, and paid out.

---

## What Gets Proved (and What Stays Private)

| The chain can see | Nobody can see |
|---|---|
| That a bounty exists (amount, deadline) | Which wallet posted it |
| That a submission was made | Who submitted it |
| The outcome of each submission | Any wallet↔identity link |
| Fee and payout totals | The org or hunter secret keys |

**How?** Each participant holds a random 32-byte secret key locally. Circuits derive a one-way commitment from it and prove statements about it inside a zero-knowledge proof:

- Hunters prove "I'm submitting honestly" without revealing who they are.
- Orgs prove "I own this bounty" when resolving — without revealing which bounty poster they are.
- Secret keys never appear in Supabase, the UI, or anywhere on-chain. Browser and hosting metadata can still reveal timing and IP information.

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

**I lost my hunter key**
Restore the downloaded backup. Without it, the encrypted Inbox and hunter claim identity cannot be recovered.
