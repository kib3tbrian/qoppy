# Copyboard — React Native Clipboard Manager

A polished, production-ready clipboard manager built with Expo + React Native.
Save text snippets, tap once to copy, organise with categories.

---

## Quick Start

```bash
npm install
npx expo start        # Expo Go (dev)
npx expo run:ios      # Native build
npx expo run:android
```

---

## Architecture

```
src/
├── types/          Shared TypeScript interfaces (Snippet, Category, nav params)
├── constants/      COLORS, CATEGORY_COLORS, FREE_TIER_LIMIT, ANIMATION_DURATION
├── services/
│   └── database.ts Singleton SQLite service — all DB access goes through here
├── hooks/
│   ├── useSnippets.ts   State + clipboard + CRUD (the "ViewModel")
│   └── useCategories.ts Category state
├── components/
│   ├── cards/SnippetCard.tsx      Tap-to-copy card with Reanimated animations
│   ├── common/CategoryChipBar.tsx Horizontal filter chips
│   └── common/SearchBar.tsx       Controlled search input
├── screens/
│   ├── HomeScreen.tsx             Main grid — search, filter, FAB
│   ├── FavoritesScreen.tsx        Starred snippets
│   ├── AddSnippetScreen.tsx       Create / edit modal
│   ├── ManageCategoriesScreen.tsx Full CRUD + color/icon picker
│   ├── OnboardingScreen.tsx       3-step animated carousel
│   ├── PaywallScreen.tsx          Monthly/yearly toggle + RevenueCat stub
│   └── SettingsScreen.tsx         Prefs, data management, about
└── navigation/
    ├── RootNavigator.tsx    DB init → onboarding check → stack nav
    └── MainTabNavigator.tsx Custom dark bottom tab bar
```

### Data Flow

```
UI Component
    │ calls
    ▼
useSnippets / useCategories   (hooks)
    │ calls
    ▼
DatabaseService (db singleton)
    │ runs
    ▼
expo-sqlite (WAL mode)
```

The hooks own **all local state** — components never call `db` directly.
The DB service owns **all SQL** — hooks never write raw queries.

---

## Key Design Decisions

### Tap-to-Copy Animation (`SnippetCard.tsx`)
Three Reanimated shared values fire simultaneously on tap:
1. `scale` — spring press-down (0.96) + release (1.0)
2. `copyProgress` — interpolates card background from dark-grey → dark-green → back
3. `glowOpacity` — fades in a success-coloured border ring, then out

### Responsive Grid
`NUM_COLUMNS` is computed from `Dimensions.get('window').width` at module load:
- `≤ 420px` → 2 columns (most phones)
- `> 420px` → 3 columns (large phones / tablets)

### SQLite Schema
- `WAL` journal mode for concurrent reads
- `ON DELETE SET NULL` FK so deleting a category doesn't nuke snippets
- Key-value `preferences` table (onboarded, haptic, etc.)
- Optimised JOIN queries — category name/color arrive with each snippet in one round-trip

---

## RevenueCat Integration

In `PaywallScreen.tsx`, find the `purchase()` function and replace the stub:

```ts
// Install: npx expo install react-native-purchases
import Purchases from 'react-native-purchases';

// In App.tsx useEffect:
await Purchases.configure({ apiKey: 'YOUR_RC_KEY' });

// In PaywallScreen purchase():
const { customerInfo } = await Purchases.purchaseProduct(
  plan === 'yearly' ? 'cm_premium_yearly' : 'cm_premium_monthly'
);
```

---

## Extending

| Task | Where |
|------|-------|
| Add a new screen | `src/screens/` → register in `RootNavigator` |
| New DB table | `database.ts` → add `CREATE TABLE` to `runMigrations()` |
| New global state | Create a `use*.ts` hook; don't use Zustand unless needed |
| Cloud sync | Add a `sync.ts` service alongside `database.ts` |
| Widget (iOS) | Use `expo-shared-preferences` + Swift widget extension |

---

## Assets needed (replace placeholders)

- `assets/icon.png` — 1024×1024
- `assets/splash.png` — 1284×2778 (or use `resizeMode: contain`)
- `assets/adaptive-icon.png` — 1024×1024 (Android foreground)
- `assets/favicon.png` — 32×32 (web)
