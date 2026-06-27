import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import { WorkStyle, GamificationLevel, ThemeMode, MainMotivation } from '../types';
import { Sun, Moon, Smartphone, ChevronRight, ChevronLeft, Rocket, Sparkles } from 'lucide-react';
import {
    DEFAULT_NOTIFICATION_EVENING,
    DEFAULT_NOTIFICATION_MORNING,
    normalizeReminderHour,
} from '../lib/reminders';
import {
    getFirebaseMessagingConfigError,
    requestFirebaseNotificationPermission,
    saveTokenToFirestore,
} from '../lib/notificationSync';
import { REFERRER_STORAGE_KEY } from '../lib/shareCard';

const TOTAL_STEPS = 5;

export function Onboarding() {
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [workStyle, setWorkStyle] = useState<WorkStyle>('FLEXIBLE');
    const [mainMotivation, setMainMotivation] = useState<MainMotivation>('FOCUS');
    const [dailyGoal, setDailyGoal] = useState(3);
    const [gamificationLevel, setGamificationLevel] = useState<GamificationLevel>('STANDARD');
    const [theme, setTheme] = useState<ThemeMode>('DARK');
    const [notificationMorning, setNotificationMorning] = useState(DEFAULT_NOTIFICATION_MORNING);
    const [notificationEvening, setNotificationEvening] = useState(DEFAULT_NOTIFICATION_EVENING);
    const navigate = useNavigate();
    const completeOnboarding = useUserStore((s) => s.completeOnboarding);
    const [referrer] = useState<string | null>(() => {
        try {
            return window.localStorage.getItem(REFERRER_STORAGE_KEY);
        } catch {
            return null;
        }
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'DARK') {
            root.classList.add('dark');
        } else if (theme === 'LIGHT') {
            root.classList.remove('dark');
        } else {
            const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
            if (prefersDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }, [theme]);

    const [finishing, setFinishing] = useState(false);

    const handleFinish = async () => {
        if (finishing) return;
        setFinishing(true);

        const morning = normalizeReminderHour(notificationMorning, DEFAULT_NOTIFICATION_MORNING);
        const evening = normalizeReminderHour(notificationEvening, DEFAULT_NOTIFICATION_EVENING);

        // Only claim notifications are enabled if we actually got permission and
        // registered a token. Otherwise the toggle would lie about its state.
        let notificationsEnabled = false;
        if (!getFirebaseMessagingConfigError()) {
            try {
                const token = await requestFirebaseNotificationPermission();
                if (token) {
                    await saveTokenToFirestore(token, morning, evening);
                    notificationsEnabled = true;
                }
            } catch (error) {
                console.error('Failed to register notifications during onboarding:', error);
                notificationsEnabled = false;
            }
        }

        completeOnboarding({
            displayName: name || 'Hero',
            workStyle,
            mainMotivation,
            dailyGoal,
            gamificationLevel,
            theme,
            notificationMorning: morning,
            notificationEvening: evening,
            notificationsEnabled,
        });
        try { window.localStorage.removeItem(REFERRER_STORAGE_KEY); } catch { /* noop */ }
        navigate('/');
    };

    const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
    const prev = () => setStep((s) => Math.max(s - 1, 0));

    const slideVariants = {
        enter: { x: 100, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -100, opacity: 0 },
    };

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center px-6 py-8"
            style={{
                paddingTop: 'calc(2rem + env(safe-area-inset-top, 0px))',
                paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
                paddingLeft: 'calc(1.5rem + env(safe-area-inset-left, 0px))',
                paddingRight: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
            }}
        >
            {referrer && (
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-sm mb-5 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-400/15 to-cyan-500/15 border border-cyan-400/30"
                >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" strokeWidth={2.6} />
                    <p className="text-xs font-semibold text-cyan-200 leading-tight">
                        Joining via <span className="font-black">@{referrer}</span> — welcome, hero.
                    </p>
                </motion.div>
            )}

            {/* Progress bar */}
            <div className="w-full max-w-sm mb-8">
                <div className="flex gap-2">
                    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${i <= step ? 'xp-gradient' : 'bg-[var(--color-surface-hover)]'
                                }`}
                        />
                    ))}
                </div>
                <p className="text-xs text-center text-[var(--color-text-secondary)] mt-2">
                    {step + 1} of {TOTAL_STEPS}
                </p>
            </div>

            <div className="w-full max-w-sm flex-1 flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                    >
                        {step === 0 && (
                            <div className="text-center space-y-6">
                                <div className="text-5xl mb-4">👋</div>
                                <h2 className="text-2xl font-black gradient-text">Welcome!</h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    What should we call you?
                                </p>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your name"
                                    className="w-full px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-center text-lg font-medium"
                                    autoFocus
                                />
                                <div>
                                    <p className="text-sm font-medium mb-3">Your work style</p>
                                    <div className="space-y-2">
                                        {([
                                            { value: 'MORNING', emoji: '🌅', label: 'Morning person', desc: 'Most productive in the AM' },
                                            { value: 'NIGHT', emoji: '🌙', label: 'Night owl', desc: 'Peak performance at night' },
                                            { value: 'FLEXIBLE', emoji: '⚡', label: 'Flexible', desc: 'Productive anytime' },
                                        ] as { value: WorkStyle; emoji: string; label: string; desc: string }[]).map((opt) => (
                                            <motion.button
                                                key={opt.value}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={() => setWorkStyle(opt.value)}
                                                className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center gap-3 ${workStyle === opt.value
                                                    ? 'bg-cyan-500/10 border-2 border-cyan-500/40'
                                                    : 'glass-card'
                                                    }`}
                                            >
                                                <span className="text-2xl">{opt.emoji}</span>
                                                <div>
                                                    <p className="text-sm font-bold">{opt.label}</p>
                                                    <p className="text-xs text-[var(--color-text-secondary)]">{opt.desc}</p>
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 1 && (
                            <div className="text-center space-y-6">
                                <div className="text-5xl mb-4">🌟</div>
                                <h2 className="text-2xl font-black gradient-text">Main Motivation</h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    Why are you here? This shapes your daily quests.
                                </p>
                                <div className="space-y-3 mt-4">
                                    {([
                                        { value: 'ADHD', emoji: '🧠', label: 'Tame an ADHD brain', desc: 'Beat overwhelm — externalize & just start.' },
                                        { value: 'FOCUS', emoji: '🎯', label: 'Find focus', desc: 'Stop procrastinating & prioritize.' },
                                        { value: 'DECLUTTER', emoji: '🧘‍♂️', label: 'Declutter mind', desc: 'Clear your head from tasks chaos.' },
                                        { value: 'HABITS', emoji: '📈', label: 'Build habits', desc: 'Develop healthy daily routines.' },
                                        { value: 'REWARDS', emoji: '🚀', label: 'Get rewarded', desc: 'Feel achievement for your work.' },
                                    ] as { value: MainMotivation; emoji: string; label: string; desc: string }[]).map((opt) => (
                                        <motion.button
                                            key={opt.value}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => {
                                                setMainMotivation(opt.value);
                                                if (opt.value === 'ADHD') setDailyGoal(2);
                                                if (opt.value === 'FOCUS') setDailyGoal(3);
                                                if (opt.value === 'DECLUTTER') setDailyGoal(6);
                                                if (opt.value === 'HABITS') setDailyGoal(4);
                                                if (opt.value === 'REWARDS') setDailyGoal(5);
                                            }}
                                            className={`w-full text-left p-4 rounded-xl transition-all ${mainMotivation === opt.value
                                                ? 'bg-cyan-500/10 border-2 border-cyan-500/40'
                                                : 'glass-card'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{opt.emoji}</span>
                                                <div>
                                                    <p className="text-sm font-bold">{opt.label}</p>
                                                    <p className="text-xs text-[var(--color-text-secondary)]">{opt.desc}</p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="text-center space-y-6">
                                <div className="text-5xl mb-4">⚔️</div>
                                <h2 className="text-2xl font-black gradient-text">Challenge Level</h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    How tough should the gamification be?
                                </p>
                                <div className="space-y-3 mt-4">
                                    {([
                                        { value: 'CASUAL', emoji: '😊', label: 'Casual', desc: 'Light penalties, forgiving. Good for starters.' },
                                        { value: 'STANDARD', emoji: '💪', label: 'Standard', desc: 'Balanced penalties. Recommended.' },
                                        { value: 'HARDCORE', emoji: '🔥', label: 'Hardcore', desc: 'Heavy penalties, no freeze tokens. For warriors.' },
                                    ] as { value: GamificationLevel; emoji: string; label: string; desc: string }[]).map((opt) => (
                                        <motion.button
                                            key={opt.value}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setGamificationLevel(opt.value)}
                                            className={`w-full text-left p-4 rounded-xl transition-all ${gamificationLevel === opt.value
                                                ? 'bg-cyan-500/10 border-2 border-cyan-500/40'
                                                : 'glass-card'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{opt.emoji}</span>
                                                <div>
                                                    <p className="text-sm font-bold">{opt.label}</p>
                                                    <p className="text-xs text-[var(--color-text-secondary)]">{opt.desc}</p>
                                                </div>
                                            </div>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center space-y-6">
                                <div className="text-5xl mb-4">🔔</div>
                                <h2 className="text-2xl font-black gradient-text">Notifications</h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    Set your reminder times (can be changed later)
                                </p>
                                <div className="space-y-4 mt-4">
                                    <div className="glass-card rounded-xl p-4">
                                        <label className="text-sm font-medium block mb-2">Morning Reminder</label>
                                        <div className="w-full bg-[var(--color-surface-hover)] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary-500/50 transition-all overflow-hidden flex items-center">
                                            <input
                                                type="time"
                                                value={notificationMorning}
                                                onChange={(e) => setNotificationMorning(e.target.value)}
                                                step={3600}
                                                className="w-full bg-transparent border-none outline-none appearance-none text-center text-lg p-0 m-0 block"
                                            />
                                        </div>
                                    </div>
                                    <div className="glass-card rounded-xl p-4">
                                        <label className="text-sm font-medium block mb-2">Evening Summary</label>
                                        <div className="w-full bg-[var(--color-surface-hover)] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary-500/50 transition-all overflow-hidden flex items-center">
                                            <input
                                                type="time"
                                                value={notificationEvening}
                                                onChange={(e) => setNotificationEvening(e.target.value)}
                                                step={3600}
                                                className="w-full bg-transparent border-none outline-none appearance-none text-center text-lg p-0 m-0 block"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="text-center space-y-6">
                                <div className="text-5xl mb-4">🎨</div>
                                <h2 className="text-2xl font-black gradient-text">Theme</h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    Choose your preferred appearance
                                </p>
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    {([
                                        { value: 'LIGHT', icon: <Sun className="w-6 h-6" />, label: 'Light' },
                                        { value: 'DARK', icon: <Moon className="w-6 h-6" />, label: 'Dark' },
                                        { value: 'AUTO', icon: <Smartphone className="w-6 h-6" />, label: 'Auto' },
                                    ] as { value: ThemeMode; icon: React.ReactNode; label: string }[]).map((opt) => (
                                        <motion.button
                                            key={opt.value}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setTheme(opt.value)}
                                            className={`flex flex-col items-center gap-2 py-6 rounded-2xl transition-all ${theme === opt.value
                                                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40'
                                                : 'glass-card text-[var(--color-text-secondary)]'
                                                }`}
                                        >
                                            {opt.icon}
                                            <span className="text-sm font-medium">{opt.label}</span>
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation buttons */}
            <div className="w-full max-w-sm flex items-center justify-between mt-8">
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={prev}
                    className={`flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${step === 0 ? 'opacity-0 pointer-events-none' : 'glass-card'
                        }`}
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </motion.button>

                {step < TOTAL_STEPS - 1 ? (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={next}
                        className="flex items-center gap-1 px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium text-sm shadow-lg shadow-primary-500/30"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </motion.button>
                ) : (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleFinish}
                        disabled={finishing}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/30 disabled:opacity-60"
                    >
                        <Rocket className="w-4 h-4" />
                        {finishing ? 'Setting up…' : "Let's Go!"}
                    </motion.button>
                )}
            </div>
        </div>
    );
}
