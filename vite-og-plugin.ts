import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import type { ReactNode } from 'react';

type SatoriChild = SatoriNode | string;

interface SatoriNode {
    type: string;
    props: {
        children?: SatoriChild | SatoriChild[];
        [key: string]: unknown;
    };
}

function h(type: string, props: Record<string, unknown> = {}, ...children: SatoriChild[]): SatoriNode {
    return {
        type,
        props: {
            ...props,
            children: children.length === 1 ? children[0] : children,
        },
    };
}

let cachedFontBuffer: ArrayBuffer | null = null;

function getMotivationalLine(streak: number): string {
    if (streak >= 100) return 'UNSTOPPABLE FORCE';
    if (streak >= 60) return 'LEGENDARY DISCIPLINE';
    if (streak >= 30) return 'BUILT DIFFERENT';
    if (streak >= 14) return 'ON ANOTHER LEVEL';
    if (streak >= 7) return 'MOMENTUM IS REAL';
    if (streak >= 3) return 'THE GRIND CONTINUES';
    if (streak >= 1) return 'THE JOURNEY BEGINS';
    return 'READY TO START';
}

function getStreakEmoji(streak: number): string {
    if (streak >= 100) return '💎';
    if (streak >= 60) return '👑';
    if (streak >= 30) return '⚡';
    if (streak >= 14) return '🔥';
    if (streak >= 7) return '✨';
    if (streak >= 3) return '🚀';
    if (streak >= 1) return '💪';
    return '🌱';
}

interface TierConfig {
    tierLabel: string;
    tierIcon: string;
    bgMain: string;
    accentColor: string;
    accentGlow: string;
    meshOverlay: string;
    streakGradient: string;
    cardBorderGradient: string;
}

function getTier(streak: number): TierConfig {
    if (streak >= 100) return {
        tierLabel: 'MYTHIC', tierIcon: '💎',
        bgMain: 'linear-gradient(145deg, #0a0014 0%, #1a0033 25%, #2d0066 50%, #0a0033 75%, #0a0014 100%)',
        accentColor: '#e040fb', accentGlow: 'rgba(224, 64, 251, 0.5)',
        meshOverlay: 'radial-gradient(ellipse at 30% 40%, rgba(224, 64, 251, 0.2) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(103, 58, 183, 0.25) 0%, transparent 45%), radial-gradient(circle at 50% 10%, rgba(255, 215, 0, 0.1) 0%, transparent 40%)',
        streakGradient: 'linear-gradient(135deg, #e040fb, #7c4dff, #448aff)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(224,64,251,0.8), rgba(124,77,255,0.3), rgba(255,215,0,0.6), rgba(224,64,251,0.5))',
    };
    if (streak >= 30) return {
        tierLabel: 'GOLD', tierIcon: '👑',
        bgMain: 'linear-gradient(145deg, #0d0d0d 0%, #1a1000 25%, #2d1b00 50%, #1a1000 75%, #0d0d0d 100%)',
        accentColor: '#ffd700', accentGlow: 'rgba(255, 215, 0, 0.45)',
        meshOverlay: 'radial-gradient(ellipse at 25% 45%, rgba(255, 215, 0, 0.2) 0%, transparent 55%), radial-gradient(ellipse at 75% 25%, rgba(255, 183, 77, 0.15) 0%, transparent 45%), radial-gradient(circle at 50% 80%, rgba(255, 215, 0, 0.08) 0%, transparent 40%)',
        streakGradient: 'linear-gradient(135deg, #ffd700, #ffab00, #ff6d00)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(255,215,0,0.8), rgba(255,171,0,0.2), rgba(255,109,0,0.5), rgba(255,215,0,0.6))',
    };
    if (streak >= 14) return {
        tierLabel: 'SILVER', tierIcon: '⚔️',
        bgMain: 'linear-gradient(145deg, #0d1117 0%, #161b22 30%, #21262d 60%, #0d1117 100%)',
        accentColor: '#c9d1d9', accentGlow: 'rgba(201, 209, 217, 0.35)',
        meshOverlay: 'radial-gradient(ellipse at 30% 50%, rgba(201, 209, 217, 0.12) 0%, transparent 55%), radial-gradient(ellipse at 70% 30%, rgba(139, 148, 158, 0.15) 0%, transparent 50%)',
        streakGradient: 'linear-gradient(135deg, #e8eaed, #c9d1d9, #8b949e)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(201,209,217,0.6), rgba(139,148,158,0.15), rgba(201,209,217,0.4))',
    };
    if (streak >= 4) return {
        tierLabel: 'BRONZE', tierIcon: '🛡️',
        bgMain: 'linear-gradient(145deg, #1a1210 0%, #2d1f14 30%, #3e2b1a 60%, #1a1210 100%)',
        accentColor: '#cd7f32', accentGlow: 'rgba(205, 127, 50, 0.4)',
        meshOverlay: 'radial-gradient(ellipse at 25% 50%, rgba(205, 127, 50, 0.15) 0%, transparent 55%), radial-gradient(ellipse at 75% 30%, rgba(205, 127, 50, 0.1) 0%, transparent 50%)',
        streakGradient: 'linear-gradient(135deg, #daa06d, #cd7f32, #a0522d)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(205,127,50,0.6), rgba(160,82,45,0.15), rgba(205,127,50,0.4))',
    };
    return {
        tierLabel: 'WOOD', tierIcon: '🪵',
        bgMain: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #1a1a2e 100%)',
        accentColor: '#8d6e63', accentGlow: 'rgba(141, 110, 99, 0.4)',
        meshOverlay: 'radial-gradient(ellipse at 20% 50%, rgba(141, 110, 99, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(141, 110, 99, 0.1) 0%, transparent 50%)',
        streakGradient: 'linear-gradient(135deg, #a1887f, #8d6e63)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(141,110,99,0.6), rgba(141,110,99,0.1), rgba(141,110,99,0.4))',
    };
}

function buildStatCard(u: (v: number) => string, label: string, value: string, sub: string, accentColor: string) {
    return h('div', {
        style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flex: 1, padding: `${u(28)} ${u(16)}`, borderRadius: u(24),
            backgroundColor: 'rgba(255,255,255,0.04)', border: `${u(1)} solid rgba(255,255,255,0.08)`,
            gap: u(6),
        }
    },
        h('div', { style: { display: 'flex', fontSize: u(22), fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: u(3), textTransform: 'uppercase' } }, label),
        h('div', { style: { display: 'flex', fontSize: u(52), fontWeight: '900', color: accentColor } }, value),
        h('div', { style: { display: 'flex', fontSize: u(18), fontWeight: '500', color: 'rgba(255,255,255,0.3)' } }, sub)
    );
}

export async function generateOGImage(url: string) {
    const searchParams = new URL(url, 'http://localhost').searchParams;
    const username = searchParams.get('username') || 'Quester';
    const currentStreak = parseInt(searchParams.get('streak') || '0', 10);
    const bestStreak = parseInt(searchParams.get('best') || '0', 10);
    const rank = searchParams.get('rank') || 'Novice Voyager';
    const level = parseInt(searchParams.get('level') || '1', 10);
    const xp = parseInt(searchParams.get('xp') || '0', 10);
    const tasks = parseInt(searchParams.get('tasks') || '0', 10);

    const requestedWidth = parseInt(searchParams.get('w') || '1080', 10);
    const requestedHeight = parseInt(searchParams.get('h') || '1920', 10);
    const imageWidth = Number.isFinite(requestedWidth) ? Math.min(Math.max(requestedWidth, 720), 1440) : 1080;
    const imageHeight = Number.isFinite(requestedHeight) ? Math.min(Math.max(requestedHeight, 1280), 3200) : 1920;
    const u = (value: number) => `${Math.round((value * imageWidth) / 1080)}px`;

    const tier = getTier(currentStreak);
    const motivational = getMotivationalLine(currentStreak);
    const emoji = getStreakEmoji(currentStreak);

    const element = h('div', {
        style: {
            display: 'flex', flexDirection: 'column',
            width: `${imageWidth}px`, height: `${imageHeight}px`,
            background: tier.bgMain, position: 'relative',
            color: 'white', boxSizing: 'border-box', overflow: 'hidden',
        }
    },
        // Mesh gradient overlay
        h('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: tier.meshOverlay, display: 'flex' } }),
        // Subtle scanlines
        h('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03, background: 'repeating-linear-gradient(0deg, white 0px, transparent 1px, transparent 3px)', display: 'flex' } }),
        // Holographic shine 1
        h('div', { style: { position: 'absolute', top: u(-200), left: u(200), width: u(300), height: u(2400), background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.03) 30%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 70%, transparent 100%)', transform: 'rotate(25deg)', display: 'flex' } }),
        // Holographic shine 2
        h('div', { style: { position: 'absolute', top: u(-100), right: u(100), width: u(150), height: u(2200), background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.02) 40%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 60%, transparent 100%)', transform: 'rotate(20deg)', display: 'flex' } }),
        // Card border
        h('div', { style: { position: 'absolute', top: u(48), left: u(48), right: u(48), bottom: u(48), borderRadius: u(48), border: `${u(3)} solid transparent`, background: tier.cardBorderGradient, display: 'flex', opacity: 0.7 } }),
        // Main content
        h('div', {
            style: {
                position: 'absolute', top: u(51), left: u(51), right: u(51), bottom: u(51),
                borderRadius: u(46), display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }
        },
            h('div', {
                style: {
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                    height: '100%', width: '100%', padding: `${u(80)} ${u(60)}`,
                }
            },
                // TOP: Identity
                h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: u(16) } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: u(12), padding: `${u(10)} ${u(30)}`, borderRadius: u(100), backgroundColor: 'rgba(255,255,255,0.06)', border: `${u(1)} solid rgba(255,255,255,0.1)`, fontSize: u(24), fontWeight: '700', letterSpacing: u(6), color: tier.accentColor, textTransform: 'uppercase' } }, `${tier.tierIcon} ${tier.tierLabel} TIER`),
                    h('div', { style: { display: 'flex', fontSize: u(72), fontWeight: '900', letterSpacing: u(-1), textShadow: `0 ${u(4)} ${u(30)} ${tier.accentGlow}`, marginTop: u(12) } }, username),
                    h('div', { style: { display: 'flex', fontSize: u(32), fontWeight: '600', color: 'rgba(255,255,255,0.5)', letterSpacing: u(4), textTransform: 'uppercase' } }, rank)
                ),
                // CENTER: Streak Hero
                h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', flex: 1 } },
                    h('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: u(500), height: u(500), borderRadius: '50%', background: `radial-gradient(circle, ${tier.accentGlow} 0%, transparent 70%)`, filter: `blur(${u(60)})`, display: 'flex' } }),
                    h('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: u(600), height: u(600), borderRadius: '50%', border: `${u(1)} solid rgba(255,255,255,0.05)`, display: 'flex' } }),
                    h('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: u(480), height: u(480), borderRadius: '50%', border: `${u(1)} solid rgba(255,255,255,0.04)`, display: 'flex' } }),
                    h('div', { style: { display: 'flex', fontSize: u(56), marginBottom: u(12) } }, emoji),
                    h('div', { style: { display: 'flex', fontSize: u(28), fontWeight: '700', letterSpacing: u(14), textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: u(4) } }, 'DAY STREAK'),
                    h('div', { style: { display: 'flex', fontSize: u(280), fontWeight: '900', lineHeight: '1', background: tier.streakGradient, backgroundClip: 'text', color: 'transparent', letterSpacing: u(-8) } }, String(currentStreak)),
                    h('div', { style: { display: 'flex', marginTop: u(16), padding: `${u(12)} ${u(36)}`, borderRadius: u(100), backgroundColor: 'rgba(255,255,255,0.05)', border: `${u(1)} solid rgba(255,255,255,0.08)`, fontSize: u(26), fontWeight: '800', letterSpacing: u(5), color: 'rgba(255,255,255,0.6)' } }, motivational)
                ),
                // BOTTOM: Stats + Branding
                h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: u(36) } },
                    h('div', { style: { display: 'flex', width: '100%', gap: u(16) } },
                        buildStatCard(u, 'BEST', String(bestStreak), 'days', tier.accentColor),
                        buildStatCard(u, 'LEVEL', String(level), `${xp.toLocaleString()} XP`, tier.accentColor),
                        buildStatCard(u, 'QUESTS', String(tasks), 'done', tier.accentColor)
                    ),
                    h('div', { style: { display: 'flex', width: u(200), height: u(2), background: `linear-gradient(90deg, transparent, ${tier.accentColor}, transparent)`, opacity: 0.3 } }),
                    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(8) } },
                        h('div', { style: { display: 'flex', fontSize: u(44), fontWeight: '900', letterSpacing: u(8), color: 'rgba(255,255,255,0.35)' } }, 'QUESTDO'),
                        h('div', { style: { display: 'flex', fontSize: u(20), fontWeight: '600', letterSpacing: u(6), color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase' } }, 'Level up your life')
                    )
                )
            )
        )
    );

    if (!cachedFontBuffer) {
        const fontResponse = await fetch('https://unpkg.com/inter-ui/Inter%20(web)/fonts/Inter-Bold.woff');
        cachedFontBuffer = await fontResponse.arrayBuffer();
    }

    const svg = await satori(element as unknown as ReactNode, {
        width: imageWidth,
        height: imageHeight,
        fonts: [
            {
                name: 'Inter',
                data: cachedFontBuffer,
                weight: 700,
                style: 'normal',
            },
        ],
    });

    const resvg = new Resvg(svg, {
        fitTo: { mode: 'original' },
    });
    const pngData = resvg.render();
    return pngData.asPng();
}
