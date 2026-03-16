import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useUserStore } from '../stores/userStore';
import {
    getFirebaseMessagingConfigError,
    requestFirebaseNotificationPermission,
    saveTokenToFirestore,
    removeTokenFromFirestore,
} from '../lib/firebase';
import { Moon, Sun, Smartphone, Download, Trash2, Shield, Snowflake, Bell, BellOff, Upload } from 'lucide-react';
import { GamificationLevel, ThemeMode } from '../types';
import { toLocalDateKey } from '../lib/dates';
import {
    DEFAULT_NOTIFICATION_EVENING,
    DEFAULT_NOTIFICATION_MORNING,
    normalizeReminderHour,
    normalizeReminderSettings,
} from '../lib/reminders';
import {
    ACHIEVEMENT_STORE_KEY,
    APP_STORAGE_KEYS,
    DEVICE_ID_KEY,
    MISSION_STORE_KEY,
    TASK_STORE_KEY,
    USER_STORE_KEY,
    clearAppStorage,
} from '../lib/storage';

type StorageBackup = {
    version: 2;
    exportedAt: string;
    stores: Partial<Record<(typeof APP_STORAGE_KEYS)[number], string>>;
};

const isStorageBackup = (value: unknown): value is StorageBackup => {
    return typeof value === 'object'
        && value !== null
        && 'version' in value
        && value.version === 2
        && 'stores' in value
        && typeof value.stores === 'object'
        && value.stores !== null;
};

export function Settings() {
    const { settings, updateSettings, streakFreezeTokens, resetUser } = useUserStore();
    const [importError, setImportError] = useState('');
    const notificationConfigError = getFirebaseMessagingConfigError();

    useEffect(() => {
        const normalizedSettings = normalizeReminderSettings({
            notificationMorning: settings.notificationMorning,
            notificationEvening: settings.notificationEvening,
        });

        if (
            normalizedSettings.notificationMorning !== settings.notificationMorning
            || normalizedSettings.notificationEvening !== settings.notificationEvening
        ) {
            updateSettings(normalizedSettings);
        }
    }, [
        settings.notificationEvening,
        settings.notificationMorning,
        updateSettings,
    ]);

    const themeOptions: { value: ThemeMode; icon: React.ReactNode; label: string }[] = [
        { value: 'LIGHT', icon: <Sun className="w-4 h-4" />, label: 'Light' },
        { value: 'DARK', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
        { value: 'AUTO', icon: <Smartphone className="w-4 h-4" />, label: 'Auto' },
    ];

    const gamificationOptions: { value: GamificationLevel; label: string; desc: string }[] = [
        { value: 'CASUAL', label: 'Casual', desc: 'Light penalties, relaxed' },
        { value: 'STANDARD', label: 'Standard', desc: 'Balanced challenge' },
        { value: 'HARDCORE', label: 'Hardcore', desc: 'Heavy penalties, no freezes' },
    ];

    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayValues = [1, 2, 3, 4, 5, 6, 0];

    const toggleWorkDay = (day: number) => {
        const current = settings.workDays;
        const newDays = current.includes(day)
            ? current.filter((d) => d !== day)
            : [...current, day];
        updateSettings({ workDays: newDays });
    };



    const handleExportData = () => {
        const stores = Object.fromEntries(
            APP_STORAGE_KEYS
                .filter((key) => key !== DEVICE_ID_KEY)
                .map((key) => [key, localStorage.getItem(key) ?? ''])
                .filter(([, value]) => value !== '')
        ) as StorageBackup['stores'];

        const data: StorageBackup = {
            version: 2,
            exportedAt: new Date().toISOString(),
            stores,
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `todolist-export-${toLocalDateKey(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string) as unknown;

                    if (isStorageBackup(data)) {
                        clearAppStorage();
                        APP_STORAGE_KEYS
                            .filter((key) => key !== DEVICE_ID_KEY)
                            .forEach((key) => {
                                const value = data.stores[key];
                                if (typeof value === 'string' && value.length > 0) {
                                    localStorage.setItem(key, value);
                                }
                            });
                        window.location.reload();
                        return;
                    }

                    if (
                        typeof data === 'object'
                        && data !== null
                        && 'tasks' in data
                        && Array.isArray(data.tasks)
                        && 'user' in data
                        && data.user
                        && typeof data.user === 'object'
                    ) {
                        clearAppStorage();
                        localStorage.setItem(TASK_STORE_KEY, JSON.stringify({
                            state: {
                                tasks: data.tasks,
                                completions: 'completions' in data && Array.isArray(data.completions) ? data.completions : [],
                                penalties: 'penalties' in data && Array.isArray(data.penalties) ? data.penalties : [],
                            },
                            version: 0,
                        }));
                        localStorage.setItem(USER_STORE_KEY, JSON.stringify({ state: data.user, version: 0 }));
                        localStorage.removeItem(ACHIEVEMENT_STORE_KEY);
                        localStorage.removeItem(MISSION_STORE_KEY);
                        window.location.reload();
                        return;
                    }

                    setImportError('Invalid file format');
                    setTimeout(() => setImportError(''), 3000);
                } catch {
                    setImportError('Failed to parse file');
                    setTimeout(() => setImportError(''), 3000);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleReset = async () => {
        if (window.confirm('Are you sure? This will delete all your data, tasks, and progress. This cannot be undone.')) {
            try {
                await removeTokenFromFirestore();
            } catch (error) {
                console.error(error);
            }
            resetUser();
            clearAppStorage();
            window.location.reload();
        }
    };

    return (
        <div className="page-container">
            <h1 className="text-2xl font-bold mb-6">Settings</h1>

            {/* Theme */}
            <Section title="Appearance">
                <label className="text-sm font-medium mb-2 block">Theme</label>
                <div className="grid grid-cols-3 gap-2">
                    {themeOptions.map((opt) => (
                        <motion.button
                            key={opt.value}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => updateSettings({ theme: opt.value })}
                            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${settings.theme === opt.value
                                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                : 'card-surface'
                                }`}
                        >
                            {opt.icon}
                            {opt.label}
                        </motion.button>
                    ))}
                </div>
            </Section>


            {/* Gamification Level */}
            <Section title="Gamification">
                <div className="space-y-2">
                    {gamificationOptions.map((opt) => (
                        <motion.button
                            key={opt.value}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => updateSettings({ gamificationLevel: opt.value })}
                            className={`w-full text-left p-3 rounded-xl transition-all ${settings.gamificationLevel === opt.value
                                ? 'bg-primary-500/10 border-2 border-primary-500'
                                : 'card-surface'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold">{opt.label}</p>
                                    <p className="text-xs text-[var(--color-text-secondary)]">{opt.desc}</p>
                                </div>
                                {settings.gamificationLevel === opt.value && (
                                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                                        <Shield className="w-3.5 h-3.5 text-white" />
                                    </div>
                                )}
                            </div>
                        </motion.button>
                    ))}
                </div>
            </Section>

            {/* Streak Freeze */}
            <Section title="Streak Freeze">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Snowflake className="w-5 h-5 text-blue-400" />
                        <span className="text-sm">Available freeze tokens</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all ${i < streakFreezeTokens
                                    ? 'bg-blue-400 shadow-sm shadow-blue-400/50'
                                    : 'bg-[var(--color-surface-hover)]'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                    Freeze tokens activate automatically to protect your streak when you miss a day.
                    {settings.gamificationLevel === 'HARDCORE'
                        ? ' Disabled in Hardcore mode.'
                        : ' Earn a new token each time you level up (max 3).'}
                </p>
            </Section>

            {/* Notifications */}
            <Section title="Notifications">
                <Toggle
                    label="Enable Notifications"
                    description="Receive morning and evening reminders at the start of the selected hour"
                    checked={settings.notificationsEnabled}
                    onChange={async (v) => {
                        if (v) {
                            if (notificationConfigError) {
                                alert(notificationConfigError);
                                updateSettings({ notificationsEnabled: false });
                                return;
                            }

                            const token = await requestFirebaseNotificationPermission();
                            if (token) {
                                try {
                                    updateSettings({ notificationsEnabled: true });
                                    await saveTokenToFirestore(token, settings.notificationMorning, settings.notificationEvening);
                                } catch (error) {
                                    console.error(error);
                                    updateSettings({ notificationsEnabled: false });
                                    alert('Notifications could not be saved. Check backend env/config and try again.');
                                }
                            } else {
                                alert('Please allow notifications in your browser settings to use this feature.');
                                updateSettings({ notificationsEnabled: false });
                            }
                        } else {
                            updateSettings({ notificationsEnabled: false });
                            try {
                                await removeTokenFromFirestore();
                            } catch (error) {
                                console.error(error);
                                alert('Failed to remove notification token from the backend.');
                            }
                        }
                    }}
                    icon={settings.notificationsEnabled ? <Bell className="w-4 h-4 text-primary-500" /> : <BellOff className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                />
                {notificationConfigError && (
                    <p className="text-xs text-amber-500 mt-3">
                        {notificationConfigError}
                    </p>
                )}
                {settings.notificationsEnabled && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="space-y-3 mt-3"
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm block">Morning Reminder</span>
                                <span className="text-xs text-[var(--color-text-secondary)]">Sent near the top of the selected hour</span>
                            </div>
                            <input
                                type="time"
                                value={settings.notificationMorning}
                                onChange={async (e) => {
                                    const val = normalizeReminderHour(
                                        e.target.value,
                                        DEFAULT_NOTIFICATION_MORNING
                                    );
                                    updateSettings({ notificationMorning: val });
                                    if (!settings.notificationsEnabled) return;

                                    const token = await requestFirebaseNotificationPermission();
                                    if (!token) return;

                                    try {
                                        await saveTokenToFirestore(token, val, settings.notificationEvening);
                                    } catch (error) {
                                        console.error(error);
                                        alert('Failed to update morning reminder on the backend.');
                                    }
                                }}
                                step={3600}
                                className="px-3 py-1.5 rounded-lg border-none bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm block">Evening Summary</span>
                                <span className="text-xs text-[var(--color-text-secondary)]">Sent near the top of the selected hour</span>
                            </div>
                            <input
                                type="time"
                                value={settings.notificationEvening}
                                onChange={async (e) => {
                                    const val = normalizeReminderHour(
                                        e.target.value,
                                        DEFAULT_NOTIFICATION_EVENING
                                    );
                                    updateSettings({ notificationEvening: val });
                                    if (!settings.notificationsEnabled) return;

                                    const token = await requestFirebaseNotificationPermission();
                                    if (!token) return;

                                    try {
                                        await saveTokenToFirestore(token, settings.notificationMorning, val);
                                    } catch (error) {
                                        console.error(error);
                                        alert('Failed to update evening reminder on the backend.');
                                    }
                                }}
                                step={3600}
                                className="px-3 py-1.5 rounded-lg border-none bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-sm"
                            />
                        </div>
                    </motion.div>
                )}
            </Section>

            {/* Work Days */}
            <Section title="Work Days">
                <p className="text-xs text-[var(--color-text-secondary)] mb-2">
                    Days that count toward your streak
                </p>
                <div className="flex gap-2">
                    {dayValues.map((day, i) => (
                        <motion.button
                            key={day}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => toggleWorkDay(day)}
                            className={`w-10 h-10 rounded-xl text-xs font-bold transition-all ${settings.workDays.includes(day)
                                ? 'bg-primary-500 text-white'
                                : 'card-surface text-[var(--color-text-secondary)]'
                                }`}
                        >
                            {dayLabels[i]}
                        </motion.button>
                    ))}
                </div>
            </Section>

            {/* Toggles */}
            <Section title="Features">
                <Toggle
                    label="Daily Missions"
                    description="Generate 3 missions each day"
                    checked={settings.dailyMissionsEnabled}
                    onChange={(v) => updateSettings({ dailyMissionsEnabled: v })}
                />
                <Toggle
                    label="Health Bar"
                    description="Track health with critical deadlines"
                    checked={settings.healthBarEnabled}
                    onChange={(v) => updateSettings({ healthBarEnabled: v })}
                />
            </Section>

            {/* Data */}
            <Section title="Data">
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExportData}
                    className="w-full flex items-center gap-3 p-3 rounded-xl card-surface mb-2"
                >
                    <Download className="w-5 h-5 text-primary-500" />
                    <div className="text-left">
                        <p className="text-sm font-medium">Export Data</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Download all your data as JSON</p>
                    </div>
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleImportData}
                    className="w-full flex items-center gap-3 p-3 rounded-xl card-surface mb-2"
                >
                    <Upload className="w-5 h-5 text-green-500" />
                    <div className="text-left">
                        <p className="text-sm font-medium">Import Data</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            {importError || 'Restore from a JSON backup'}
                        </p>
                    </div>
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleReset}
                    className="w-full flex items-center gap-3 p-3 rounded-xl card-surface border-red-500/20"
                >
                    <Trash2 className="w-5 h-5 text-red-500" />
                    <div className="text-left">
                        <p className="text-sm font-medium text-red-500">Reset All Data</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">Delete everything and start fresh</p>
                    </div>
                </motion.button>
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">
                {title}
            </h2>
            {children}
        </div>
    );
}

function Toggle({
    label,
    description,
    checked,
    onChange,
    icon,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    icon?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
                {icon}
                <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
                </div>
            </div>
            <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => onChange(!checked)}
                className={`relative w-12 h-7 rounded-full transition-colors ${checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
            >
                <motion.div
                    animate={{ x: checked ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md"
                />
            </motion.button>
        </div>
    );
}
