import { Suspense, lazy, useEffect, useState } from 'react';
import { onRaidLoot, type RaidLoot } from '../../lib/raidDamage';
import type { RandomReward } from '../../types';

const RandomRewardModal = lazy(() =>
    import('./RandomRewardModal').then((module) => ({ default: module.RandomRewardModal }))
);

/**
 * Plays a loot-drop chest whenever the hero lands the killing blow on a raid
 * boss. Lives in the AppShell (always mounted) so the drop fires no matter
 * which screen the task was completed on. The coins/XP are already awarded in
 * dispatchRaidDamage — this is purely the celebration.
 */
export function RaidLootListener() {
    const [reward, setReward] = useState<RandomReward | null>(null);

    useEffect(() => onRaidLoot((loot: RaidLoot) => {
        setReward({
            // Beefier bosses crack open the EPIC chest; coins are the headline
            // prize since they spend in the Avatar Shop.
            type: loot.tier >= 4 ? 'CHEST' : 'POUCH',
            amount: loot.coins,
            currency: 'COINS',
        });
    }), []);

    if (!reward) return null;

    return (
        <Suspense fallback={null}>
            <RandomRewardModal reward={reward} onClose={() => setReward(null)} />
        </Suspense>
    );
}
