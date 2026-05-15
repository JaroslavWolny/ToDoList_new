import { ImageResponse } from '@vercel/og';

export const config = {
    runtime: 'edge',
};

// Helper: generate a motivational quote based on streak milestones
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

// Vercel OG API Endpoint
// Generates a 1080x1920 (9:16) collectible share card for Instagram Stories
export default function handler(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

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

        // Tier system — dark base with restrained accent, not flood-gold
        let tierLabel = 'WOOD';
        let tierIcon = '🪵';
        let bgMain = 'linear-gradient(160deg, #0b0d12 0%, #0e1119 50%, #0a0c11 100%)';
        let accentColor = '#a78b6f';
        let accentGlow = 'rgba(167, 139, 111, 0.35)';
        let meshOverlay = 'radial-gradient(ellipse at 22% 18%, rgba(167, 139, 111, 0.06) 0%, transparent 55%), radial-gradient(ellipse at 78% 82%, rgba(167, 139, 111, 0.04) 0%, transparent 55%)';
        let cardBorderGradient = 'linear-gradient(135deg, rgba(167,139,111,0.5), rgba(167,139,111,0.05) 40%, rgba(167,139,111,0.08) 70%, rgba(167,139,111,0.35))';

        if (currentStreak >= 100) {
            tierLabel = 'MYTHIC';
            tierIcon = '💎';
            bgMain = 'linear-gradient(160deg, #0a0014 0%, #15021f 50%, #08000f 100%)';
            accentColor = '#d68bff';
            accentGlow = 'rgba(214, 139, 255, 0.4)';
            meshOverlay = 'radial-gradient(ellipse at 25% 18%, rgba(214, 139, 255, 0.09) 0%, transparent 55%), radial-gradient(ellipse at 75% 82%, rgba(124, 77, 255, 0.07) 0%, transparent 55%)';
            cardBorderGradient = 'linear-gradient(135deg, rgba(214,139,255,0.6), rgba(124,77,255,0.08) 40%, rgba(255,215,0,0.12) 70%, rgba(214,139,255,0.45))';
        } else if (currentStreak >= 30) {
            tierLabel = 'GOLD';
            tierIcon = '👑';
            bgMain = 'linear-gradient(160deg, #0b0a08 0%, #14110a 50%, #08070a 100%)';
            accentColor = '#ffcb46';
            accentGlow = 'rgba(255, 203, 70, 0.32)';
            meshOverlay = 'radial-gradient(ellipse at 25% 18%, rgba(255, 203, 70, 0.07) 0%, transparent 55%), radial-gradient(ellipse at 75% 82%, rgba(255, 168, 50, 0.05) 0%, transparent 55%)';
            cardBorderGradient = 'linear-gradient(135deg, rgba(255,203,70,0.55), rgba(255,168,50,0.05) 40%, rgba(255,203,70,0.1) 70%, rgba(255,203,70,0.4))';
        } else if (currentStreak >= 14) {
            tierLabel = 'SILVER';
            tierIcon = '⚔️';
            bgMain = 'linear-gradient(160deg, #0c0e12 0%, #131820 50%, #0a0c11 100%)';
            accentColor = '#d6dde6';
            accentGlow = 'rgba(214, 221, 230, 0.3)';
            meshOverlay = 'radial-gradient(ellipse at 25% 18%, rgba(214, 221, 230, 0.06) 0%, transparent 55%), radial-gradient(ellipse at 75% 82%, rgba(139, 148, 158, 0.05) 0%, transparent 55%)';
            cardBorderGradient = 'linear-gradient(135deg, rgba(214,221,230,0.5), rgba(139,148,158,0.05) 40%, rgba(214,221,230,0.08) 70%, rgba(214,221,230,0.35))';
        } else if (currentStreak >= 4) {
            tierLabel = 'BRONZE';
            tierIcon = '🛡️';
            bgMain = 'linear-gradient(160deg, #0d0a08 0%, #15110c 50%, #0a0807 100%)';
            accentColor = '#d99060';
            accentGlow = 'rgba(217, 144, 96, 0.32)';
            meshOverlay = 'radial-gradient(ellipse at 25% 18%, rgba(217, 144, 96, 0.07) 0%, transparent 55%), radial-gradient(ellipse at 75% 82%, rgba(160, 82, 45, 0.05) 0%, transparent 55%)';
            cardBorderGradient = 'linear-gradient(135deg, rgba(217,144,96,0.55), rgba(160,82,45,0.05) 40%, rgba(217,144,96,0.1) 70%, rgba(217,144,96,0.4))';
        }

        const motivational = getMotivationalLine(currentStreak);
        const emoji = getStreakEmoji(currentStreak);

        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: `${imageWidth}px`,
                        height: `${imageHeight}px`,
                        background: bgMain,
                        position: 'relative',
                        color: 'white',
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                    }}
                >
                    {/* Mesh gradient overlay for depth */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: meshOverlay,
                            display: 'flex',
                        }}
                    />

                    {/* Subtle noise texture via dots */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            opacity: 0.03,
                            background: 'repeating-linear-gradient(0deg, white 0px, transparent 1px, transparent 3px)',
                            display: 'flex',
                        }}
                    />

                    {/* Single holographic shine — restrained, off-center */}
                    <div
                        style={{
                            position: 'absolute',
                            top: u(-200),
                            left: u(140),
                            width: u(240),
                            height: u(2400),
                            background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.025) 45%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.025) 55%, transparent 100%)',
                            transform: 'rotate(22deg)',
                            display: 'flex',
                        }}
                    />

                    {/* Top vignette to anchor identity */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: u(700),
                            background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)',
                            display: 'flex',
                        }}
                    />

                    {/* Card border with gradient */}
                    <div
                        style={{
                            position: 'absolute',
                            top: u(48),
                            left: u(48),
                            right: u(48),
                            bottom: u(48),
                            borderRadius: u(48),
                            border: `${u(3)} solid transparent`,
                            background: cardBorderGradient,
                            display: 'flex',
                            opacity: 0.7,
                        }}
                    />

                    {/* Main content area */}
                    <div
                        style={{
                            position: 'absolute',
                            top: u(51),
                            left: u(51),
                            right: u(51),
                            bottom: u(51),
                            borderRadius: u(46),
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Inner content with padding */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                height: '100%',
                                width: '100%',
                                padding: `${u(80)} ${u(60)}`,
                            }}
                        >
                            {/* ===== TOP SECTION: Identity ===== */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    width: '100%',
                                    gap: u(16),
                                }}
                            >
                                {/* Avatar badge */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: u(150),
                                        height: u(150),
                                        borderRadius: '50%',
                                        background: `linear-gradient(150deg, ${avatarColor} 0%, ${avatarColor}cc 100%)`,
                                        boxShadow: `0 ${u(10)} ${u(40)} ${avatarColor}33, inset 0 ${u(2)} ${u(4)} rgba(255,255,255,0.25), inset 0 -${u(2)} ${u(8)} rgba(0,0,0,0.25)`,
                                        fontSize: u(76),
                                        fontWeight: '900',
                                        color: 'white',
                                        letterSpacing: u(-2),
                                        textShadow: `0 ${u(2)} ${u(4)} rgba(0,0,0,0.35)`,
                                    }}
                                >
                                    {avatarInitial}
                                </div>

                                {/* Tier badge pill */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: u(10),
                                        padding: `${u(10)} ${u(28)}`,
                                        borderRadius: u(100),
                                        backgroundColor: `${accentColor}14`,
                                        border: `${u(1)} solid ${accentColor}55`,
                                        fontSize: u(24),
                                        fontWeight: '800',
                                        letterSpacing: u(6),
                                        color: accentColor,
                                        textTransform: 'uppercase',
                                        marginTop: u(6),
                                    }}
                                >
                                    {tierIcon} {tierLabel} TIER
                                </div>

                                {/* Username */}
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: u(82),
                                        fontWeight: '900',
                                        letterSpacing: u(-2),
                                        color: 'white',
                                        marginTop: u(14),
                                        lineHeight: 1,
                                    }}
                                >
                                    {username}
                                </div>

                                {/* Handle */}
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: u(30),
                                        fontWeight: '600',
                                        color: accentColor,
                                        marginTop: u(8),
                                    }}
                                >
                                    @{handle}
                                </div>

                                {/* Rank subtitle */}
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: u(24),
                                        fontWeight: '700',
                                        color: 'rgba(255,255,255,0.55)',
                                        letterSpacing: u(6),
                                        textTransform: 'uppercase',
                                        marginTop: u(6),
                                    }}
                                >
                                    {rank}
                                </div>
                            </div>

                            {/* ===== CENTER SECTION: Streak Hero ===== */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    width: '100%',
                                    flex: 1,
                                }}
                            >
                                {/* Subtle, contained glow behind streak number */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: u(320),
                                        height: u(320),
                                        borderRadius: '50%',
                                        background: `radial-gradient(circle, ${accentGlow} 0%, transparent 65%)`,
                                        filter: `blur(${u(30)})`,
                                        opacity: 0.7,
                                        display: 'flex',
                                    }}
                                />

                                {/* Single concentric ring */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: u(560),
                                        height: u(560),
                                        borderRadius: '50%',
                                        border: `${u(1)} solid rgba(255,255,255,0.05)`,
                                        display: 'flex',
                                    }}
                                />

                                {/* Emoji halo */}
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: u(60),
                                        marginBottom: u(10),
                                    }}
                                >
                                    {emoji}
                                </div>

                                {/* Day streak label */}
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: u(26),
                                        fontWeight: '800',
                                        letterSpacing: u(14),
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.6)',
                                        marginBottom: u(2),
                                    }}
                                >
                                    DAY STREAK
                                </div>

                                {/* The streak number — hero element */}
                                <div
                                    style={{
                                        display: 'flex',
                                        fontSize: u(300),
                                        fontWeight: '900',
                                        lineHeight: '1',
                                        color: 'white',
                                        textShadow: `0 ${u(4)} ${u(24)} ${accentGlow}`,
                                        letterSpacing: u(-12),
                                    }}
                                >
                                    {currentStreak}
                                </div>

                                {/* Motivational line */}
                                <div
                                    style={{
                                        display: 'flex',
                                        marginTop: u(20),
                                        padding: `${u(12)} ${u(34)}`,
                                        borderRadius: u(100),
                                        backgroundColor: `${accentColor}1a`,
                                        border: `${u(1)} solid ${accentColor}44`,
                                        fontSize: u(24),
                                        fontWeight: '800',
                                        letterSpacing: u(5),
                                        color: accentColor,
                                    }}
                                >
                                    {motivational}
                                </div>
                            </div>

                            {/* ===== BOTTOM SECTION: Stats Grid + Branding ===== */}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    width: '100%',
                                    gap: u(36),
                                }}
                            >
                                {/* Stats Grid — glassmorphism cards with white numerics */}
                                <div
                                    style={{
                                        display: 'flex',
                                        width: '100%',
                                        gap: u(14),
                                    }}
                                >
                                    {[
                                        { label: 'BEST', value: `${bestStreak}`, unit: 'days' },
                                        { label: 'LEVEL', value: `${level}`, unit: `${xp.toLocaleString()} XP` },
                                        { label: 'QUESTS', value: `${tasks}`, unit: 'done' },
                                    ].map((stat) => (
                                        <div
                                            key={stat.label}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flex: 1,
                                                padding: `${u(28)} ${u(12)}`,
                                                borderRadius: u(28),
                                                background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
                                                border: `${u(1)} solid rgba(255,255,255,0.09)`,
                                                gap: u(6),
                                                position: 'relative',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    width: u(28),
                                                    height: u(2),
                                                    background: accentColor,
                                                    borderRadius: u(2),
                                                    opacity: 0.7,
                                                    marginBottom: u(4),
                                                }}
                                            />
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    fontSize: u(20),
                                                    fontWeight: '700',
                                                    color: accentColor,
                                                    letterSpacing: u(4),
                                                    textTransform: 'uppercase',
                                                }}
                                            >
                                                {stat.label}
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    fontSize: u(60),
                                                    fontWeight: '900',
                                                    color: 'white',
                                                    letterSpacing: u(-2),
                                                    lineHeight: 1,
                                                    marginTop: u(2),
                                                }}
                                            >
                                                {stat.value}
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    fontSize: u(18),
                                                    fontWeight: '600',
                                                    color: 'rgba(255,255,255,0.5)',
                                                    marginTop: u(2),
                                                }}
                                            >
                                                {stat.unit}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Personality stats strip */}
                                {hasPersonality && (
                                    <div
                                        style={{
                                            display: 'flex',
                                            width: '100%',
                                            gap: u(10),
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {[
                                            topTag && { icon: '◆', label: topTag },
                                            peakHour && { icon: '◷', label: peakHour },
                                            topDay && { icon: '★', label: topDay },
                                        ]
                                            .filter(Boolean)
                                            .map((item, i) => (
                                                <div
                                                    key={i}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: u(8),
                                                        padding: `${u(11)} ${u(20)}`,
                                                        borderRadius: u(100),
                                                        backgroundColor: 'rgba(255,255,255,0.06)',
                                                        border: `${u(1)} solid rgba(255,255,255,0.12)`,
                                                        fontSize: u(22),
                                                        fontWeight: '700',
                                                        color: 'rgba(255,255,255,0.85)',
                                                    }}
                                                >
                                                    <span style={{ display: 'flex', fontSize: u(22), color: accentColor }}>{(item as { icon: string }).icon}</span>
                                                    {(item as { label: string }).label}
                                                </div>
                                            ))}
                                    </div>
                                )}

                                {/* Divider line */}
                                <div
                                    style={{
                                        display: 'flex',
                                        width: u(240),
                                        height: u(1),
                                        background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                                        opacity: 0.5,
                                    }}
                                />

                                {/* Branding + CTA URL */}
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: u(14),
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: u(10),
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                width: u(8),
                                                height: u(8),
                                                borderRadius: '50%',
                                                background: accentColor,
                                            }}
                                        />
                                        <div
                                            style={{
                                                display: 'flex',
                                                fontSize: u(30),
                                                fontWeight: '900',
                                                letterSpacing: u(8),
                                                color: 'rgba(255,255,255,0.7)',
                                            }}
                                        >
                                            QUESTDO
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                width: u(8),
                                                height: u(8),
                                                borderRadius: '50%',
                                                background: accentColor,
                                            }}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            padding: `${u(14)} ${u(30)}`,
                                            borderRadius: u(100),
                                            background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.04) 100%)',
                                            border: `${u(1)} solid ${accentColor}55`,
                                            fontSize: u(26),
                                            fontWeight: '700',
                                            letterSpacing: u(1),
                                            color: 'white',
                                        }}
                                    >
                                        questdo.app/from/{handle}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: imageWidth,
                height: imageHeight,
            }
        );
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error(message);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
