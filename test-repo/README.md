# Shopflow — Canopy Test Repo

Intentionally inefficient TypeScript/Node.js e-commerce API for testing Canopy pattern detection and graph visualization.

## Seeded inefficiency patterns

| Pattern | Files | Count |
|---|---|---|
| POLLING | orders/orderService | 1 |
| N+1 QUERIES | inventory/stockChecker | 1 |
| SYNC BLOCKING | users/profileService | 1 |

## Seeded graph connections

| Connection | Type | Visual |
|---|---|---|
| orders → notifications | hard (import) | solid green line |
| orders → inventory | hard (import) | solid green line |
| inventory → notifications | hard (import) | solid green line |
| analytics → users | hard (import) | solid green line |
| orders ↔ analytics | soft (shared utils/) | faint dashed line |
| users ↔ inventory | soft (shared utils/) | faint dashed line |

> This repo is intentionally bad code for testing purposes only.
