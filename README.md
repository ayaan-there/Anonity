# Anonity

![CI](https://github.com/ayaan-there/Anonity/actions/workflows/ci.yml/badge.svg)

> A privacy-preserving bug bounty platform on [Midnight Network](https://midnight.network). This repo starts with the foundation: an owner-gated counter contract where the owner proves authority with a zero-knowledge proof — never revealing their secret key on-chain.

Level 2 (Waxing Crescent) submission for the Midnight Builder Challenge.

---

## Live Demo

**URL:** https://an0n1ty.vercel.app/

Connect your wallet, call the increment circuit, and watch the counter tick up — all without revealing your private key on-chain.

---

## Contract Address

| Network  | Address                                                          |
|----------|------------------------------------------------------------------|
| Preview  | 8aab69118bde5a18cae92def5d7a933e3c3059998619242285ea7d34b5b1abb8 |
| Preprod  | 63bfa0aec1cd8f8a768487dfd72fa5fc5e90bc311c9873006af30b694ab8cd7b |

---

## What This Does

The current deployment is a privacy-preserving counter that only the owner can increment. The owner proves they hold the right secret key without ever revealing it. Think of it as a private gate — the chain sees a valid proof of authority, but never the authority itself.

The frontend lets you connect a Midnight wallet and trigger increment against the deployed Preprod contract. The private key stays in your wallet — the circuit gets a witness, not the raw secret.

**Circuits:**

| Circuit | Auth | Effect |
|---------|------|--------|
| increment() | owner-only | count + 1 |
| decrement() | owner-only | count - 1 |
| eset() | owner-only | count = 0, rotates round |
| get() | public | returns current count |
| publicKey(sk) | pure | derives owner commitment |

This is the foundation of Anonity's staking system: a user stakes tokens, the contract verifies their right to act, and the private key never leaves their wallet.

---

## Privacy Model

- **PUBLIC (on-chain, visible to anyone):** count (current counter value), owner (commitment derived from persistentHash(
