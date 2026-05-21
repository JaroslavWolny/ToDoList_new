import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudUpload, CloudDownload, Loader2 } from 'lucide-react';
import { onMigrationPrompt, type MigrationPrompt as MigrationPromptType } from '../../lib/cloudSync';

export function MigrationPromptModal() {
    const [prompt, setPrompt] = useState<MigrationPromptType | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    useEffect(() => onMigrationPrompt(setPrompt), []);

    const handle = async (action: 'migrate-local' | 'use-cloud') => {
        if (!prompt || busy) return;
        setBusy(action);
        try {
            await prompt.apply(action);
        } finally {
            setBusy(null);
        }
    };

    return (
        <AnimatePresence>
            {prompt && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="card-surface w-full max-w-md rounded-3xl p-6 space-y-4"
                    >
                        <div className="text-center space-y-2">
                            <h2 className="text-lg font-bold">Which data should we keep?</h2>
                            <p className="text-sm text-[var(--color-text-secondary)]">
                                You have local data on this device and data in the cloud. Which one do you want to use?
                            </p>
                        </div>

                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => handle('migrate-local')}
                                disabled={!!busy}
                                className="w-full rounded-xl py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', color: 'white' }}
                            >
                                {busy === 'migrate-local' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CloudUpload className="w-4 h-4" />
                                )}
                                Use local (overwrites cloud)
                            </button>
                            <button
                                type="button"
                                onClick={() => handle('use-cloud')}
                                disabled={!!busy}
                                className="w-full card-surface rounded-xl py-3 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
                            >
                                {busy === 'use-cloud' ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <CloudDownload className="w-4 h-4" />
                                )}
                                Use cloud (overwrites local)
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
