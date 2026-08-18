# Product Proposal

## What is the product, and who uses it?
Anonity is a privacy-preserving bug bounty platform that connects security researchers with organizations without requiring researchers to reveal their real-world identity to the organization.

Researchers use Anonity to discover bug bounty programs, check their scope and requirements, submit vulnerability reports, communicate with organizations, build reputation/Signal, and receive bounties.

Organizations use it to create bounty programs, define scope and rules, receive and triage vulnerability reports, communicate with researchers, award bounties, request retesting, and manage disclosure.

The main difference from existing platforms is that the researcher can remain pseudonymous while still proving that they are trustworthy and eligible to participate. Reputation, Signal, eligibility and other requirements can be verified through zero-knowledge proofs instead of exposing the researcher's complete history or identity.

## Why Midnight specifically?
I chose Midnight because Anonity requires privacy without sacrificing verification.

A normal blockchain would make sensitive information and payment activity publicly traceable, which defeats the purpose of the platform. Midnight allows me to keep sensitive information private while still using the blockchain to verify that certain conditions are true.

For example, instead of giving an organization my complete hacker history, I can prove:
- Signal > 80
- Reputation > 5,000
- Valid reports > 10
- Eligible for this program
...without revealing the underlying private information.

Midnight also gives me the ability to combine private state, public state, zero-knowledge proofs, programmable privacy and shielded transactions, which directly fits the requirements of Anonity.

## Data Model
| Data Point | Type | Disclosed To |
|---|---|---|
| Program ID | Public ledger | Everyone |
| Program name | Public ledger | Everyone |
| Program scope | Public ledger | Everyone |
| Program rules | Public ledger | Everyone |
| Bounty policy | Public ledger | Everyone |
| Anonymous Researcher ID | Pseudonymous | Platform + relevant organization |
| Real-world identity | Private witness | Researcher only / authorized disclosure |
| Email / personal information | Private witness | Researcher only / authorized disclosure |
| Reputation | Private state | Researcher; selectively provable |
| Signal | Private state | Researcher; selectively provable |
| Impact | Private state | Researcher; selectively provable |
| Eligibility proof | ZK proof | Relevant organization |
| Vulnerability report | Private application data | Researcher + organization |
| PoC / attachments | Private application data | Researcher + organization |
| Report status | Private/public | Relevant parties |
| Severity | Private/public | Relevant parties |
| Bounty amount | Private/shielded | Researcher + organization |
| Payment recipient | Private | Researcher / required compliance party |
| Payment transaction | Shielded | Authorized parties |
| Reputation update | Private state + proof | Researcher/platform |
| Disclosed vulnerability | Public | Everyone after disclosure |

## Mainnet Feasibility
Yes, I believe it is technically realistic.

The main reason I chose Midnight is that its architecture already provides the privacy primitives that Anonity needs, so I don't need to create my own privacy blockchain or cryptographic infrastructure from scratch.

My planned development would be:
MVP to Anonymous researcher identity to Bug bounty programs to Private vulnerability reports to Reputation + Signal to ZK eligibility proofs to Midnight Preprod testing to Private escrow / bounty system to Shielded payouts to Security audit to Midnight Mainnet.

The biggest challenges I expect are Sybil resistance, reputation integrity, smart-contract security, privacy-preserving payments, and legal/compliance requirements, rather than the basic feasibility of building the technology.
