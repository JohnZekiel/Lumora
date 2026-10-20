# Lumora rebuild — Copilot instructions

## Product
Calm productivity app: tasks, focus timer, break wellness, analytics, optional voice/AI.
**Five bottom tabs only**: Home, Timer, Add, Settings, Profile. Do not invent Achievements.

## Stack (lockfile is authoritative)
- Expo SDK 57 (React Native + TypeScript strict)
- Expo Go as the primary dev target — **no custom native modules**
- Supabase for auth only; productivity data is local AsyncStorage
- React Navigation bottom tabs (not Expo Router unless explicitly requested)
- No Redux/Zustand/MobX; feature-scoped React context + hooks

## Architecture
- `src/features/<feature>/` owns screens, hooks, and domain logic
- `src/shared/` owns UI components, theme, types, validation
- `src/infrastructure/` owns storage, Supabase client, audio, notifications
- Domain rules (validation, timer transitions, analytics) must be **pure functions** — no React imports
- Do **not** put timer lifecycle, audio players, notifications, and task CRUD in one provider

## Hard rules
- Never put `GROQ_API_KEY` or any secret in `EXPO_PUBLIC_*` or client code
- Use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` only
- All user input validated before persistence (title ≤160 chars, estimate 1–480 min, ≤10 steps)
- Timer accuracy from absolute `endTime`, never from tick counts
- Do not claim a feature works; surface failures explicitly (AI fallback, notification denial)
- English only