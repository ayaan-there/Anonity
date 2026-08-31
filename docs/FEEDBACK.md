# User Feedback — Level 5

## Feedback Collection Method

External user validation has not started yet. The entries below separate project-owner technical testing from real user feedback so the challenge record stays accurate.

For the real Level 5 round, collect feedback through consented test sessions, a short form, or direct messages. Do not collect names, email addresses, or full wallet addresses in this public repository. Keep any verification record off-repo and record only a tester alias and consent status here.

## Raw Feedback Log

| # | Tester Alias | Feedback Summary | Date | Consent |
|---|--------------|------------------|------|---------|
| 1 | Project owner | Shielded submission could not complete with an empty shielded balance and available unshielded NIGHT. | 2026-08-31 | N/A |
| 2 | Project owner | A separate transparent recording deployment was needed, with an explicit warning that it is not the privacy deployment. | 2026-08-31 | N/A |
| 3 | Project owner | The demo deployment initially loaded the wrong verifier assets in the frontend. | 2026-09-01 | N/A |

## What We Heard (Themes)

- Wallet funding state and shielded-vs-unshielded requirements need to be visible before a transaction begins.
- A recording fallback must never be confused with the privacy-preserving production path.
- Contract verifier assets must be selected from the same managed artifact set as the deployed address.
- Real user feedback is still outstanding; no claim of 50 external testers is made yet.

## What We Changed

| Change | Reason | Commit |
|--------|--------|--------|
| Added an isolated transparent demo contract and yellow warning banner. | Make recording possible when the wallet has no shielded NIGHT while disclosing the limitation. | `ca02c8f` |
| Added separate demo proving/verifier assets and mode-aware loading. | Prevent the demo address from being bound to the shielded contract keys. | `42dc442` |
| Added encrypted report storage chain-gated for both configured deployments. | Keep report plaintext out of Supabase while supporting the demo deployment. | `ca02c8f` |

## Level 6 Improvements

| Change | User Feedback That Triggered It | Status |
|--------|--------------------------------|--------|
| Add pre-transaction wallet readiness guidance. | Users encountered confusing DUST and shielded-balance failures. | Planned |
| Add a privacy-mode indicator to every payment-related screen. | Demo users must distinguish transparent funding from shielded funding. | Complete |
| Add a first-run troubleshooting checklist for wallet/network/proof issues. | Wallet setup was the main onboarding friction point. | Planned |
