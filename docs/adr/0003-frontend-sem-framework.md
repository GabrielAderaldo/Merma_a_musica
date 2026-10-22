---
id: ADR-0003
title: Frontend em Vanilla TS sem framework
status: superseded
date: 2026-05-13
superseded_by: ADR-0008
scope: ["apps/web/**"]
---

# ADR-0003 — Frontend em Vanilla TS sem framework

**Substituído pelo [ADR-0008](0008-frontend-solidjs-com-vite.md) no mesmo dia (2026-05-13).**

A decisão era TypeScript puro com MVVM e um observer próprio (~30 linhas) para reatividade guiada pelo WebSocket. Ela caiu porque o observer planejado era exatamente o que os signals do Solid já entregam, mais testados e com bundle final equivalente ou menor.

Mantido só como registro. O texto original completo está no git (`handbook/doc/20-architecture/adrs/0003-no-framework-frontend.md`, até o commit `6337149`).
