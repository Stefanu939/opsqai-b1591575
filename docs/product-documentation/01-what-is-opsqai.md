# 1. What is OPSQAI

**Audience:** Customer CTO, Head of Operations, decision maker
**Scope:** What OPSQAI is, what it isn't, and how to think about it
**Version:** 1.0 · **Last updated:** 2026-07-11

## In one sentence

OPSQAI is a **self-hosted, license-gated Enterprise AI platform** that turns a company's own operational knowledge (SOPs, procedures, technical documentation, training material, FAQs, internal requests) into a governed, auditable AI surface that employees can query in natural language.

## What it is

- A **web application** the customer installs on their own infrastructure (Docker or bare metal).
- A **modular product**: one mandatory _Installation License_ + optional per-module licenses (Knowledge Base, Academy, Chat, FAQ, SOPs, Brand, Internal Requests, Workspace).
- A **single-tenant deployment per install**. Each customer runs their own database, storage, and AI provider credentials.
- A **hard-gated licensing system**: Ed25519-signed tokens, offline activation supported, per-module maintenance windows.

## What it is not

- Not a SaaS. The Management Center at opsqai.de issues licenses and hosts the customer portal; it never stores customer operational data.
- Not a chatbot builder. Every module has a fixed role and enforcement path.
- Not a data lake. OPSQAI ingests documents, chunks and embeds them; it does not replicate business systems.
- Not a training platform for third-party AI. Customer data is never used to train foundation models. See the AI chapter and the Responsible AI page.

## Two roles, one product

| Role                | Where                                            | What they see                                                              |
| ------------------- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| **OPSQAI (vendor)** | opsqai.de Management Center                      | Customer registry, orders, licenses, DR bootstrap tokens                   |
| **Customer**        | Their own install + Customer Portal on opsqai.de | Their data, their users, their AI, plus contract + downloads on the portal |

The vendor never has network access to a customer install. Recovery is customer-initiated.
