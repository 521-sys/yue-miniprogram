# Offline Cantonese Call Implementation Plan

**Goal:** A no-network mini-program call prototype with real local recording and clearly labelled canned audio.
**Architecture:** A cancellable session controller consumes an injected local media port; the Taro adapter owns microphone/audio lifecycles. A new page subscribes to session state.
**Tech Stack:** Existing Taro 4, React 18, TypeScript; Node test runner and installed TypeScript compiler, no new dependencies.
**Spec:** ../specs/2026-09-16-offline-call.md

## Constraints
No paid or free cloud requests in this iteration. Do not change backend or web frontend. Local recordings never uploaded. Record 15 seconds per turn, cap session at 180 seconds. No automatic silence detection or voice interruption claims.

## Tasks
- [x] Add `tests/call-session.test.cjs` using the Node runner and TypeScript transpilation. Verify start/permission race, late recording cleanup, mute/resume, cancelled audio, errors, duration cap and no invented transcript. Run and observe missing implementation failure.
- [x] Add `lib/call/session.ts` implementing start, finishTurn, mute/resume, interrupt, end, replay, tick and dispose through an injected `CallMedia` interface. Run the behavioral tests.
- [x] Add `lib/call/media.ts` with a single recorder callback bridge (WeChat has no off APIs), startup/stop watchdogs, system interruption handling, disposable playback and local file deletion. Add adapter tests through a fake Taro boundary.
- [x] Bundle the four existing MP3s a0072/a0074/a0076/a0078 and reference them from `lib/call/demo.ts`. Add `pages/call/index.tsx`, config and styles; register route and replace the home AI shortcut with an offline call entry. Keep old chat source and route intact.
- [x] Run tests, TypeScript checks and Taro build. Inspect generated route/audio paths and bundle size. Document exact real-device steps, limitations and verification results in `docs/OFFLINE-CALL.md`.

Implementation proceeds in this session under the user's approval. The mini-program directory has no Git repository; preserve existing files in place, do not initialize or commit a repository.
