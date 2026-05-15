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
    const filtered = children.filter((c): c is SatoriChild => c !== null && c !== undefined && c !== false);
    return {
        type,
        props: {
            ...props,
            children: filtered.length === 1 ? filtered[0] : filtered,
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
    cardBorderGradient: string;
}

function getTier(streak: number): TierConfig {
    if (streak >= 100) return {
        tierLabel: 'MYTHIC', tierIcon: '💎',
        bgMain: 'linear-gradient(160deg, #0a0014 0%, #15021f 50%, #08000f 100%)',
        accentColor: '#d68bff', accentGlow: 'rgba(214, 139, 255, 0.4)',
        meshOverlay: 'radial-gradient(ellipse at 25% 18%, rgba(214, 139, 255, 0.09) 0%, transparent 55%), radial-gradient(ellipse at 75% 82%, rgba(124, 77, 255, 0.07) 0%, transparent 55%)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(214,139,255,0.6), rgba(124,77,255,0.08) 40%, rgba(255,215,0,0.12) 70%, rgba(214,139,255,0.45))',
    };
    if (streak >= 30) return {
        tierLabel: 'GOLD', tierIcon: '👑',
        bgMain: 'linear-gradient(160deg, #0b0a08 0%, #14110a 50%, #08070a 100%)',
        accentColor: '#ffcb46', accentGlow: 'rgba(255, 203, 70, 0.32)',
        meshOverlay: 'radial-gradient(ellipse at 25% 18%, rgba(255, 203, 70, 0.07) 0%, transparent 55%), radial-gradient(ellipse at 75% 82%, rgba(255, 168, 50, 0.05) 0%, transparent 55%)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(255,203,70,0.55), rgba(255,168,50,0.05) 40%, rgba(255,203,70,0.1) 70%, rgba(255,203,70,0.4))',
    };
    if (streak >= 14) return {
        tierLabel: 'SILVER', tierIcon: '⚔️',
        bgMain: 'linear-gradient(160deg, #0c0e12 0%, #131820 50%, #0a0c11 100%)',
        accentColor: '#d6dde6', accentGlow: 'rgba(214, 221, 230, 0.3)',
        meshOverlay: 'radial-gradient(ellipse at 25% 18%, rgba(214, 221, 230, 0.06) 0%, transparent 55%), radial-gradient(ellipse at 75% 82%, rgba(139, 148, 158, 0.05) 0%, transparent 55%)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(214,221,230,0.5), rgba(139,148,158,0.05) 40%, rgba(214,221,230,0.08) 70%, rgba(214,221,230,0.35))',
    };
    if (streak >= 4) return {
        tierLabel: 'BRONZE', tierIcon: '🛡️',
        bgMain: 'linear-gradient(160deg, #0d0a08 0%, #15110c 50%, #0a0807 100%)',
        accentColor: '#d99060', accentGlow: 'rgba(217, 144, 96, 0.32)',
        meshOverlay: 'radial-gradient(ellipse at 25% 18%, rgba(217, 144, 96, 0.07) 0%, transparent 55%), radial-gradient(ellipse at 75% 82%, rgba(160, 82, 45, 0.05) 0%, transparent 55%)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(217,144,96,0.55), rgba(160,82,45,0.05) 40%, rgba(217,144,96,0.1) 70%, rgba(217,144,96,0.4))',
    };
    return {
        tierLabel: 'WOOD', tierIcon: '🪵',
        bgMain: 'linear-gradient(160deg, #0b0d12 0%, #0e1119 50%, #0a0c11 100%)',
        accentColor: '#a78b6f', accentGlow: 'rgba(167, 139, 111, 0.35)',
        meshOverlay: 'radial-gradient(ellipse at 22% 18%, rgba(167, 139, 111, 0.06) 0%, transparent 55%), radial-gradient(ellipse at 78% 82%, rgba(167, 139, 111, 0.04) 0%, transparent 55%)',
        cardBorderGradient: 'linear-gradient(135deg, rgba(167,139,111,0.5), rgba(167,139,111,0.05) 40%, rgba(167,139,111,0.08) 70%, rgba(167,139,111,0.35))',
    };
}

function buildStatCard(u: (v: number) => string, label: string, value: string, sub: string, accentColor: string) {
    return h('div', {
        style: {
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flex: 1, padding: `${u(28)} ${u(12)}`, borderRadius: u(28),
            background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
            border: `${u(1)} solid rgba(255,255,255,0.09)`,
            gap: u(6), position: 'relative',
        }
    },
        h('div', { style: { display: 'flex', width: u(28), height: u(2), background: accentColor, borderRadius: u(2), opacity: 0.7, marginBottom: u(4) } }),
        h('div', { style: { display: 'flex', fontSize: u(20), fontWeight: '700', color: accentColor, letterSpacing: u(4), textTransform: 'uppercase' } }, label),
        h('div', { style: { display: 'flex', fontSize: u(60), fontWeight: '900', color: 'white', letterSpacing: u(-2), lineHeight: 1, marginTop: u(2) } }, value),
        h('div', { style: { display: 'flex', fontSize: u(18), fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginTop: u(2) } }, sub)
    );
}

function buildPersonalityPill(u: (v: number) => string, icon: string, label: string, accentColor: string) {
    return h('div', {
        style: {
            display: 'flex', alignItems: 'center', gap: u(8),
            padding: `${u(11)} ${u(20)}`, borderRadius: u(100),
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: `${u(1)} solid rgba(255,255,255,0.12)`,
            fontSize: u(22), fontWeight: '700', color: 'rgba(255,255,255,0.85)',
        }
    },
        h('span', { style: { display: 'flex', fontSize: u(22), color: accentColor } }, icon),
        label
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
    const handle = (searchParams.get('handle') || '').replace(/[^a-z0-9-]/gi, '').slice(0, 24) || 'hero';
    const avatarColor = (searchParams.get('avatarColor') || '#a78bfa').slice(0, 7);
    const topTag = (searchParams.get('topTag') || '').slice(0, 20);
    const peakHour = (searchParams.get('peakHour') || '').slice(0, 8);
    const topDay = (searchParams.get('topDay') || '').slice(0, 8);
    const avatarInitial = (username.trim()[0] || 'Q').toUpperCase();
    const hasPersonality = !!(topTag || peakHour || topDay);

    const requestedWidth = parseInt(searchParams.get('w') || '1080', 10);
    const requestedHeight = parseInt(searchParams.get('h') || '1920', 10);
    const imageWidth = Number.isFinite(requestedWidth) ? Math.min(Math.max(requestedWidth, 720), 1440) : 1080;
    const imageHeight = Number.isFinite(requestedHeight) ? Math.min(Math.max(requestedHeight, 1280), 3200) : 1920;
    const u = (value: number) => `${Math.round((value * imageWidth) / 1080)}px`;

    const tier = getTier(currentStreak);
    const motivational = getMotivationalLine(currentStreak);
    const emoji = getStreakEmoji(currentStreak);

    const personalityPills: SatoriNode[] = [];
    if (topTag) personalityPills.push(buildPersonalityPill(u, '◆', topTag, tier.accentColor));
    if (peakHour) personalityPills.push(buildPersonalityPill(u, '◷', peakHour, tier.accentColor));
    if (topDay) personalityPills.push(buildPersonalityPill(u, '★', topDay, tier.accentColor));

    const element = h('div', {
        style: {
            display: 'flex', flexDirection: 'column',
            width: `${imageWidth}px`, height: `${imageHeight}px`,
            background: tier.bgMain, position: 'relative',
            color: 'white', boxSizing: 'border-box', overflow: 'hidden',
        }
    },
        // Mesh overlay
        h('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: tier.meshOverlay, display: 'flex' } }),
        // Subtle scanlines
        h('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03, background: 'repeating-linear-gradient(0deg, white 0px, transparent 1px, transparent 3px)', display: 'flex' } }),
        // Single shine
        h('div', { style: { position: 'absolute', top: u(-200), left: u(140), width: u(240), height: u(2400), background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.025) 45%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.025) 55%, transparent 100%)', transform: 'rotate(22deg)', display: 'flex' } }),
        // Top vignette
        h('div', { style: { position: 'absolute', top: 0, left: 0, right: 0, height: u(700), background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)', display: 'flex' } }),
        // Card border
        h('div', { style: { position: 'absolute', top: u(48), left: u(48), right: u(48), bottom: u(48), borderRadius: u(48), border: `${u(3)} solid transparent`, background: tier.cardBorderGradient, display: 'flex', opacity: 0.7 } }),
        // Content
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
                    // Avatar
                    h('div', {
                        style: {
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: u(150), height: u(150), borderRadius: '50%',
                            background: `linear-gradient(150deg, ${avatarColor} 0%, ${avatarColor}cc 100%)`,
                            boxShadow: `0 ${u(10)} ${u(40)} ${avatarColor}33, inset 0 ${u(2)} ${u(4)} rgba(255,255,255,0.25), inset 0 -${u(2)} ${u(8)} rgba(0,0,0,0.25)`,
                            fontSize: u(76), fontWeight: '900', color: 'white', letterSpacing: u(-2),
                            textShadow: `0 ${u(2)} ${u(4)} rgba(0,0,0,0.35)`,
                        }
                    }, avatarInitial),
                    // Tier pill
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: u(10), padding: `${u(10)} ${u(28)}`, borderRadius: u(100), backgroundColor: `${tier.accentColor}14`, border: `${u(1)} solid ${tier.accentColor}55`, fontSize: u(24), fontWeight: '800', letterSpacing: u(6), color: tier.accentColor, textTransform: 'uppercase', marginTop: u(6) } }, `${tier.tierIcon} ${tier.tierLabel} TIER`),
                    // Username
                    h('div', { style: { display: 'flex', fontSize: u(82), fontWeight: '900', letterSpacing: u(-2), color: 'white', marginTop: u(14), lineHeight: 1 } }, username),
                    // Handle
                    h('div', { style: { display: 'flex', fontSize: u(30), fontWeight: '600', color: tier.accentColor, marginTop: u(8) } }, `@${handle}`),
                    // Rank
                    h('div', { style: { display: 'flex', fontSize: u(24), fontWeight: '700', color: 'rgba(255,255,255,0.55)', letterSpacing: u(6), textTransform: 'uppercase', marginTop: u(6) } }, rank)
                ),
                // CENTER: Streak Hero
                h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%', flex: 1 } },
                    h('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: u(320), height: u(320), borderRadius: '50%', background: `radial-gradient(circle, ${tier.accentGlow} 0%, transparent 65%)`, filter: `blur(${u(30)})`, opacity: 0.7, display: 'flex' } }),
                    h('div', { style: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: u(560), height: u(560), borderRadius: '50%', border: `${u(1)} solid rgba(255,255,255,0.05)`, display: 'flex' } }),
                    h('div', { style: { display: 'flex', fontSize: u(60), marginBottom: u(10) } }, emoji),
                    h('div', { style: { display: 'flex', fontSize: u(26), fontWeight: '800', letterSpacing: u(14), textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: u(2) } }, 'DAY STREAK'),
                    h('div', { style: { display: 'flex', fontSize: u(300), fontWeight: '900', lineHeight: '1', color: 'white', textShadow: `0 ${u(4)} ${u(24)} ${tier.accentGlow}`, letterSpacing: u(-12) } }, String(currentStreak)),
                    h('div', { style: { display: 'flex', marginTop: u(20), padding: `${u(12)} ${u(34)}`, borderRadius: u(100), backgroundColor: `${tier.accentColor}1a`, border: `${u(1)} solid ${tier.accentColor}44`, fontSize: u(24), fontWeight: '800', letterSpacing: u(5), color: tier.accentColor } }, motivational)
                ),
                // BOTTOM: Stats + Personality + Branding
                h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: u(28) } },
                    h('div', { style: { display: 'flex', width: '100%', gap: u(14) } },
                        buildStatCard(u, 'BEST', String(bestStreak), 'days', tier.accentColor),
                        buildStatCard(u, 'LEVEL', String(level), `${xp.toLocaleString()} XP`, tier.accentColor),
                        buildStatCard(u, 'QUESTS', String(tasks), 'done', tier.accentColor)
                    ),
                    hasPersonality
                        ? h('div', { style: { display: 'flex', width: '100%', gap: u(10), justifyContent: 'center' } }, ...personalityPills)
                        : null,
                    h('div', { style: { display: 'flex', width: u(240), height: u(1), background: `linear-gradient(90deg, transparent, ${tier.accentColor}, transparent)`, opacity: 0.5 } }),
                    h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: u(14) } },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: u(10) } },
                            h('div', { style: { display: 'flex', width: u(8), height: u(8), borderRadius: '50%', background: tier.accentColor } }),
                            h('div', { style: { display: 'flex', fontSize: u(30), fontWeight: '900', letterSpacing: u(8), color: 'rgba(255,255,255,0.7)' } }, 'QUESTDO'),
                            h('div', { style: { display: 'flex', width: u(8), height: u(8), borderRadius: '50%', background: tier.accentColor } })
                        ),
                        h('div', { style: { display: 'flex', padding: `${u(14)} ${u(30)}`, borderRadius: u(100), background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)', border: `${u(1)} solid ${tier.accentColor}55`, fontSize: u(26), fontWeight: '700', letterSpacing: u(1), color: 'white' } }, `questdo.app/from/${handle}`)
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
