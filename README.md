<div align="center">
  <img src="./public/icon-512.png" alt="QuestDo Logo" width="120" />
  
  # ⚔️ QuestDo 
  **Where Productivity Meets Adventure**
  
  <p>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" /></a>
    <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" /></a>
    <img src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Ready" />
  </p>

  *Turn your mundane daily to-dos into an epic RPG quest! Level up your life, build unbreakable streaks, and conquer your goals.*
</div>

---

## 🌟 Why QuestDo?

Traditional to-do lists are boring. They remind you of work. **QuestDo** reminds you of victory. 
Built as a blazing-fast, local-first Progressive Web App (PWA), it seamlessly blends habit tracking and task management with addictive RPG mechanics. Stop just checking boxes—start completing quests.

## 🔥 Epic Features

### 🗡️ Level Up Your Life
Every task is a quest. Earn **XP** for completing your to-dos, fill up your XP bar, and level up just like in your favorite RPG! The progressive XP curve ensures that every new rank feels like a true achievement.

### 🪙 Modern Avatar Shop & Customization
Complete Daily Missions (e.g., "Complete 3 Critical Tasks") to earn **Coins**. Spend these newly-earned coins in our sleek, slide-in **Avatar Shop** to unlock premium avatars with distinct **Rarity Tiers** (from Common to Legendary). Track your collection progress, easily browse with filterable tabs, and personalize your Level Badge to flex your progress!

### 🎁 Random Loot Drops
Every task you complete gives you a chance to discover hidden treasure! You might uncover a common **Lucky Pouch** or a rare, highly valuable **Chest** overflowing with extra Coins and XP. Stay productive and let the RNG reward your hard work!

### 🛡️ Guard Your Health
Missed a deadline? Procrastinated too long? You'll take damage! **Keep your Health Bar (HP) high** by staying on top of your responsibilities. If you drop to zero... you'll face the consequences of broken discipline.

### ⚡ Unbreakable Streaks & Combos
Consistency is king. Build daily **Streaks** to unlock powerful XP multipliers. Chain tasks together in quick succession to activate **Combo Multipliers** and sky-rocket your productivity stats!
- **RPG Share Cards (SSR):** Flex your consistency! Using Vercel Edge functions and `@vercel/og` (Satori), we dynamically generate flawless pixel-perfect (1080x1920) RPG-themed collectible cards representing your exact Streak Tier (Wood, Bronze, Silver, Epic/Gold). Share them directly to your Instagram Story or download the PNG to show everyone you mean business.
### 🆕 Innovative Task Management
Experience a fresh approach to task creation and editing! We've ditched boring forms for a modern, beautiful **bottom-sheet modal** that dynamically slides up, embracing a "think out of the box" design philosophy for blazing-fast input.

### 📅 Task Scheduling
Not ready for a task yet? Lock it away! Set a **Start Date** for your tasks, and they will remain locked and perfectly visible but unclickable until the precise time arrives. Plan your entire week without the anxiety of a cluttered dashboard.

### 🏆 Unlock Achievements
Collect beautiful badges and unlock unique **Achievements** as you hit major milestones. From "First Blood" (creating your first task) to "Unstoppable" (reaching a legendary streak), there's always a new goal to strive for.

### 📊 Deep Stats & Analytics
Visualize your productivity journey:
- **Heatmap Calendars** 📅 See your daily activity at a glance.
- **Dynamic XP & Growth Charts** 📈 Track your growth over the last 7 days.
- **Achievement Showcase Grid** 🌟 Show off all the badges you've earned.

### 🔔 Web Push Notifications (Firebase & Vercel)
- **Background Reminders:** 📲 The app uses Firebase Cloud Messaging (FCM) to deliver morning and evening summaries directly to your device (supports iOS 16.4+ standalone PWAs).
- **Hourly Reminder Slots:** 🕐 Reminder selection is normalized to the start of the selected hour so the UI matches the hourly cron delivery model.
- **Vercel Cron Jobs:** ⚙️ A custom Vercel Serverless Function runs automatically every hour, securely reading your timezone preferences from Firestore via the Firebase Admin SDK to ping you at the correct local reminder slot.

### 📱 Perfect PWA Experience
Install **QuestDo** directly to your phone or desktop.
- **Offline-First:** Works anywhere, anytime. Your data stays completely private in LocalStorage.
- **Native Feel:** Fluid 60fps animations powered by **Framer Motion**.
- **Responsive:** Beautiful layout adapting perfectly from mobile phones to ultra-wide displays.

---

## 🛠️ The Tech Arsenal

We forged QuestDo using the most modern web technologies:

| **Technology** | **Purpose** |
|:---|:---|
| ⚛️ **React 19** | Cutting-edge UI rendering |
| 🛡️ **TypeScript** | Bulletproof, type-safe code |
| ⚡ **Vite** | Lightning-fast build & dev server |
| 🎨 **Tailwind CSS** | Gorgeous, utility-first styling |
| 🐻 **Zustand** | Snappy, lightweight state management |
| 🎞️ **Framer Motion**| Buttery-smooth, captivating animations |
| 📈 **Recharts** | Interactive data visualization |
| 📱 **Vite PWA** | Native app capabilities & offline mode |
| 🔥 **Firebase** | Cloud Messaging (FCM) & Firestore Database |
| ▲ **Vercel** | Serverless API Functions & Daily Cron Jobs |

---

## 📁 Project Architecture

```plaintext
src/
├── components/
│   ├── gamification/     # XP bar, Health bar, Streak counter, Level badge
│   ├── layout/           # App shell, Bottom navigation for PWA
│   ├── stats/            # Achievement grid, Heatmap, XP charts
│   └── tasks/            # Task cards, Forms, Task lists
├── lib/                  # Gamification logic & Achievement definitions
├── pages/                # Dashboard, Tasks, Stats, Settings, Onboarding
├── stores/               # Zustand stores (tasks, user, achievements)
└── types/                # Strict TypeScript definitions
```

---

## 🚀 Embark on Your Quest (Installation)

Ready to begin your adventure? Setting up your local guild hall is easy:

### Prerequisites
Make sure you have **Node.js 18+** and `npm` installed.

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/JaroslavWolny/ToDoList_new.git

# 2. Enter the dungeon
cd ToDoList_new

# 3. Equip your gear (install dependencies)
npm install

# 4. Start the adventure (run dev server)
npm run dev
```

### Build for Production
```bash
npm run build
npm run preview
```

### Quality Checks
```bash
npm run lint
./node_modules/.bin/tsc --noEmit
npm run build
```

---

## Maintenance Notes

Recent audit fixes included:

- Replaced broad `localStorage.clear()` startup behavior with targeted app-storage cleanup to avoid accidental data loss.
- Added day-rollover maintenance so recurring tasks, streak checks, and overdue penalties update even if the app stays open overnight.
- Made export/import restore the full persisted app state, with backward compatibility for the older JSON backup format.
- Extended reset behavior to remove saved notification tokens and local device identifiers.
- Aligned notification settings and backend scheduling to explicit hourly reminder slots.
- Reworked mobile `TaskForm` viewport handling to use subscription-based state (`useSyncExternalStore`) instead of synchronous `setState` calls inside effects.
- Narrowed major Zustand consumers to selector-based subscriptions to reduce unnecessary rerenders in `App`, `Dashboard`, `Tasks`, `Stats`, `Settings`, and key gamification/stats components.
- Centralized repeated task and completion derivations in `taskStore` helpers so dashboard/stats views reuse the same indexed calculations instead of repeating full-array scans.
- Added timeout cleanup for modal and card UI transitions to avoid stale callbacks after unmounts.

### v2 Performance & Architecture Audit (March 2026)

A comprehensive senior-level audit identified and resolved **17 out of 21** issues:

**Critical fixes:**
- Fixed `StreakCounter` bypassing React reactivity via raw `getState()` in JSX—now uses proper `useShallow` selectors.
- Fixed AUTO theme not responding to live system dark mode changes—added `matchMedia` event listener with proper cleanup.
- Fixed `onMessageListener` memory leak in Firebase—replaced Promise-based pattern with callback-based `subscribeToMessages`.
- Added automatic pruning of completions older than 6 months during store hydration to prevent localStorage overflow (~5 MB limit).
- Removed dead `penalties` array from `taskStore`—data was persisted but never displayed anywhere.

**Performance optimizations:**
- Batched `completeTaskTransaction` from **6–8 separate store updates** (each triggering re-renders) into a **single `setState()` call** on `userStore`.
- Lazy-loaded `TaskForm` (46 KB) and `LevelUpOverlay` on the Tasks page with `Suspense` boundaries.
- Wrapped `TaskCard` and `TaskList` in `React.memo` to prevent unnecessary re-renders when parent state changes.
- Replaced inline arrow callbacks in `Tasks.tsx` with stable `useCallback` references.
- Removed duplicate `resetRecurringTasks()` call in `Dashboard` (already runs in `App`).

**Architecture improvements:**
- Unified dual `BrowserRouter` instances into a single router in `main.tsx`—previously router state was reset when transitioning out of onboarding.
- Extracted shared `useIsMobile` hook to eliminate duplicated media query logic across `TaskForm` and `AvatarShopModal`.
- Replaced `date-fns` with native `Intl.DateTimeFormat` across `TaskCard` and `XPChart`, then **uninstalled `date-fns`** entirely.
- Moved `firebase-admin`, `satori`, and `@resvg/resvg-js` from `dependencies` to `devDependencies` (server-only packages don't belong in the client bundle).

### Recent UI/UX & Native App Polish (Late March 2026)

**Mobile Experience:**
- Completely redesigned `TaskForm` with a premium, full-screen step-by-step onboarding flow specifically polished for modern iOS devices (iPhone 15 Pro). 
- Optimized touch targets, layout spacing, and visual hierarchy for a native-app feel.
- Improved the New Task form responsiveness to prevent shift glitches when the software keyboard appears.

**Gamification & UI Fixes:**
- Fixed UI glitch with the health emoji within the `HealthBar` component.
- Redesigned the `AvatarShop` to align perfectly with the gamified aesthetic (Duolingo-inspired), featuring a right-side slide-in panel, rarity tiers, and filterable tabs.
- Resolved "impure function" React warnings in `AvatarShopModal` by moving random number generation into `useEffect` / `useMemo` hooks.
- Fixed TypeScript errors and type definitions within the `AchievementGrid` component.

**Performance & UX Polish (Recent):**
- Replaced intrusive native browser alerts in the Settings page with elegant, inline toast notifications.
- Optimized date parsing in `taskStore` using `Date.parse()` to improve performance during overdue task processing.
- Added font caching to `vite-og-plugin.ts`, significantly speeding up dynamic OG Share Card generation by avoiding redundant network requests.
- Polished the `TaskForm` category selection UI to ensure smooth mobile scrolling and perfect overflow handling.

### Latest Improvements (Early April 2026)

**New Features & Enhancements:**
- **Quick Rituals:** Added a new `QuickRituals` component allowing users to seamlessly log and complete fast, repeatable daily actions without using the full task creation modal.
- **Strict Task Locking:** Enforced the scheduling logic so that tasks with a future "Reminder" (`startDate`) are explicitly locked and cannot be completed ahead of schedule.

**Robust Fixes & UI Perfection:**
- **Rock-Solid Recurring Tasks:** Overhauled date-parsing logic to rely on UTC-based day calculations, resolving issues where Daylight Saving Time (DST) shifts previously prevented daily recurring tasks from properly resetting.
- **Mobile UI Excellence:** Resolved blurry rendering of UI icons and recalibrated absolute positioning throughout the New Task flow, ensuring elements are flawlessly centered on all devices.
- **Input Alignment (iOS):** Fixed persistent visual clipping of input field borders and tuned text/icon vertical alignment to deliver a refined, native-tier input experience on iOS devices.
- **Dynamic Share Cards:** Refactored the internal serverless OG image generation logic (`api/og.tsx` & `vite-og-plugin.ts`) to resolve rendering inconsistencies, utilizing precise scaling, layout updates, and robust base64 image caching to ensure generated streak cards look identical to the native UI.
- **Avatar Shop Consistency:** Replaced native emoji elements with high-quality SVG components from `lucide-react` across the Avatar Shop to dramatically improve visual consistency and scaling boundaries across different operating systems.

---

## 💡 The Philosophy

We believe that productivity shouldn't feel like a chore. By integrating universally loved game mechanics—like immediate rewards (XP), tangible consequences (HP loss), and visual progression (Levels & Badges)—we hijack the brain's dopamine system to make doing chores as addictive as playing a video game.

## 📄 License

This quest is completely open-source under the **MIT License**. Feel free to fork, modify, and build upon it! 
Good luck, Hero! ⚔️
