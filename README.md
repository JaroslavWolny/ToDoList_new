# 🎮 QuestDo — Gamified Task Manager

A gamified to-do list PWA that transforms your daily tasks into an RPG adventure. Earn XP, level up, maintain streaks, and unlock achievements — all while staying productive.

## ✨ Features

- **🗡️ Gamification System** — Earn XP for completing tasks, level up with a progressive XP curve, and watch your character grow.
- **🔥 Streak Tracking** — Build daily streaks to earn bonus XP multipliers. Break a streak and face penalties!
- **❤️ Health & Penalties** — Missed deadlines cost you HP. Maintain your health bar by staying on top of tasks.
- **🏆 Achievements** — Unlock achievements for milestones like completing streaks, leveling up, and more.
- **⚡ Combo System** — Complete multiple tasks in quick succession to activate combo multipliers.
- **📊 Stats & Analytics** — Visualize your productivity with XP charts, heatmap calendars, and achievement grids.
- **📱 PWA Support** — Install on your device for a native-like experience with offline support.
- **🎨 Beautiful UI** — Smooth animations powered by Framer Motion, responsive design with Tailwind CSS.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **TypeScript** | Type-safe development |
| **Vite** | Build tool & dev server |
| **Tailwind CSS** | Utility-first styling |
| **Zustand** | State management |
| **Framer Motion** | Animations & transitions |
| **Recharts** | Data visualization |
| **React Router** | Client-side routing |
| **Lucide React** | Icon library |
| **vite-plugin-pwa** | PWA configuration |

## 📁 Project Structure

```
src/
├── components/
│   ├── gamification/     # XP bar, health bar, streak counter, level badge, etc.
│   ├── layout/           # App shell, bottom navigation
│   ├── stats/            # Achievement grid, heatmap, XP chart
│   └── tasks/            # Task card, task form, task list
├── lib/                  # Gamification logic & achievement definitions
├── pages/                # Dashboard, Tasks, Stats, Settings, Onboarding
├── stores/               # Zustand stores (tasks, user, achievements, missions)
└── types/                # TypeScript type definitions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/QuestDo.git
cd QuestDo

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### Build for Production

```bash
npm run build
npm run preview
```

## 📄 License

MIT
