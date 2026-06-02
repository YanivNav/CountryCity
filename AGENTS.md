# Country City — Codex Instructions

## Project overview
See [PLAN.md](./PLAN.md) for the full product spec, data model, API contract, and implementation phases.

## Monorepo layout
- `apps/mobile` — Expo SDK 56 + React Native (expo-router, Reanimated, Zustand, socket.io-client)
- `apps/api` — NestJS 11 (WebSocket gateway, Prisma 7, JWT auth, Anthropic SDK)
- `packages/shared` — shared TypeScript types and socket event constants

## Key conventions
- Shared types live in `packages/shared/src` — import from `@country-city/shared`
- All socket event names come from `EVENTS` in `@country-city/shared`
- Game state machine lives entirely server-side (no trust of client phase transitions)
- Scoring is calculated server-side in `ScoringService`
- Use `npx expo install <pkg>` (not plain `npm install`) for any Expo-native package in `apps/mobile` to get SDK-compatible versions

## Running locally
```bash
# API
cd apps/api && cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY
npm run start:dev

# Mobile
cd apps/mobile && cp .env.example .env
npm start   # or: npm run android / npm run ios
```

## Implementation phases (from PLAN.md §12)
1. **Phase 1 — MVP**: auth, rooms HTTP, GameGateway, ScoringService, all mobile screens functional
2. **Phase 2 — Polish**: animations (Reanimated), haptics, dark mode, settings UI
3. **Phase 3 — AI Validation**: DictionaryService + AiValidationService wired into submit flow
4. **Phase 4 — RTL & i18n**: Hebrew support, RTL layout
5. **Phase 5 — Social**: profiles, history, share links
6. **Phase 6 — Advanced**: spectator, tournaments, themes
