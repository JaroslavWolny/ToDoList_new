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
git clone https://github.com/YOUR_USERNAME/QuestDo.git

# 2. Enter the dungeon
cd QuestDo

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

---

## 💡 The Philosophy

We believe that productivity shouldn't feel like a chore. By integrating universally loved game mechanics—like immediate rewards (XP), tangible consequences (HP loss), and visual progression (Levels & Badges)—we hijack the brain's dopamine system to make doing chores as addictive as playing a video game.

## 📄 License

This quest is completely open-source under the **MIT License**. Feel free to fork, modify, and build upon it! 
Good luck, Hero! ⚔️
