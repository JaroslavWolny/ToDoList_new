import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../stores/userStore';
import { WorkStyle, GamificationLevel, ThemeMode } from '../types';
import { Sun, Moon, Monitor, ChevronRight, ChevronLeft, Rocket } from 'lucide-react';

const TOTAL_STEPS = 5;

export function Onboarding() {
    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [workStyle, setWorkStyle] = useState<WorkStyle>('FLEXIBLE');
    const [dailyGoal, setDailyGoal] = useState(3);
    const [gamificationLevel, setGamificationLevel] = useState<GamificationLevel>('STANDARD');
    const [theme, setTheme] = useState<ThemeMode>('DARK');
    const [notificationMorning, setNotificationMorning] = useState('08:00');
    const [notificationEvening, setNotificationEvening] = useState('21:00');
    const navigate = useNavigate();
    const completeOnboarding = useUserStore((s) => s.completeOnboarding);

    const handleFinish = () => {
        completeOnboarding({
            displayName: name || 'Hero',
            workStyle,
            dailyGoal,
            gamificationLevel,
            theme,
            notificationMorning,
            notificationEvening,
            notificationsEnabled: true,
        });
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
                                <h2 className="text-2xl font-bold">Welcome!</h2>
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
                                                    ? 'bg-primary-500/10 border-2 border-primary-500'
                                                    : 'card-surface'
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
                                <div className="text-5xl mb-4">🎯</div>
                                <h2 className="text-2xl font-bold">Daily Goal</h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    How many tasks do you want to complete per day?
                                </p>
                                <div className="py-4">
                                    <motion.div
                                        key={dailyGoal}
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        className="text-6xl font-black gradient-text mb-2"
                                    >
                                        {dailyGoal}
                                    </motion.div>
                                    <p className="text-sm text-[var(--color-text-secondary)]">tasks per day</p>
                                </div>
                                <input
                                    type="range"
                                    min={1}
                                    max={10}
                                    value={dailyGoal}
                                    onChange={(e) => setDailyGoal(parseInt(e.target.value))}
                                    className="w-full h-2 rounded-full appearance-none bg-[var(--color-surface-hover)] accent-primary-500"
                                />
                                <div className="flex justify-between">
                                    <span className="text-xs text-[var(--color-text-secondary)]">Easy (1)</span>
                                    <span className="text-xs text-[var(--color-text-secondary)]">Ambitious (10)</span>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="text-center space-y-6">
                                <div className="text-5xl mb-4">⚔️</div>
                                <h2 className="text-2xl font-bold">Challenge Level</h2>
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
                                                ? 'bg-primary-500/10 border-2 border-primary-500'
                                                : 'card-surface'
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
                                <h2 className="text-2xl font-bold">Notifications</h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    Set your reminder times (can be changed later)
                                </p>
                                <div className="space-y-4 mt-4">
                                    <div className="card-surface rounded-xl p-4">
                                        <label className="text-sm font-medium block mb-2">Morning Reminder</label>
                                        <div className="w-full bg-[var(--color-surface-hover)] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary-500/50 transition-all overflow-hidden flex items-center">
                                            <input
                                                type="time"
                                                value={notificationMorning}
                                                onChange={(e) => setNotificationMorning(e.target.value)}
                                                className="w-full bg-transparent border-none outline-none appearance-none text-center text-lg p-0 m-0 block"
                                            />
                                        </div>
                                    </div>
                                    <div className="card-surface rounded-xl p-4">
                                        <label className="text-sm font-medium block mb-2">Evening Summary</label>
                                        <div className="w-full bg-[var(--color-surface-hover)] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary-500/50 transition-all overflow-hidden flex items-center">
                                            <input
                                                type="time"
                                                value={notificationEvening}
                                                onChange={(e) => setNotificationEvening(e.target.value)}
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
                                <h2 className="text-2xl font-bold">Theme</h2>
                                <p className="text-sm text-[var(--color-text-secondary)]">
                                    Choose your preferred appearance
                                </p>
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    {([
                                        { value: 'LIGHT', icon: <Sun className="w-6 h-6" />, label: 'Light' },
                                        { value: 'DARK', icon: <Moon className="w-6 h-6" />, label: 'Dark' },
                                        { value: 'AUTO', icon: <Monitor className="w-6 h-6" />, label: 'Auto' },
                                    ] as { value: ThemeMode; icon: React.ReactNode; label: string }[]).map((opt) => (
                                        <motion.button
                                            key={opt.value}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => setTheme(opt.value)}
                                            className={`flex flex-col items-center gap-2 py-6 rounded-2xl transition-all ${theme === opt.value
                                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                                : 'card-surface'
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
                    className={`flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${step === 0 ? 'opacity-0 pointer-events-none' : 'card-surface'
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
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm shadow-lg shadow-green-500/30"
                    >
                        <Rocket className="w-4 h-4" />
                        Let's Go!
                    </motion.button>
                )}
            </div>
        </div>
    );
}
