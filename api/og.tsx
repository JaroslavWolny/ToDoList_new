import { ImageResponse } from '@vercel/og';

export const config = {
    runtime: 'edge',
};

// Vercel OG API Endpoint
// Generates a 1080x1920 (9:16) collectible RPG card
export default function (req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        // Extract parameters
        const username = searchParams.get('username') || 'Quester';
        const currentStreak = parseInt(searchParams.get('streak') || '0', 10);
        const bestStreak = parseInt(searchParams.get('best') || '0', 10);
        const rank = searchParams.get('rank') || 'Novice Voyager';

        const requestedWidth = parseInt(searchParams.get('w') || '1080', 10);
        const requestedHeight = parseInt(searchParams.get('h') || '1920', 10);
        const imageWidth = Number.isFinite(requestedWidth) ? Math.min(Math.max(requestedWidth, 720), 1440) : 1080;
        const imageHeight = Number.isFinite(requestedHeight) ? Math.min(Math.max(requestedHeight, 1280), 3200) : 1920;
        const unit = (value: number) => `${Math.round((value * imageWidth) / 1080)}px`;

        // Tier Logic
        let tierName = 'Wood';
        let bgGradient = 'linear-gradient(to bottom right, #5c4033, #3e2723, #1b0000)'; // Wood
        let frameColor = '#8d6e63'; // Wood Frame
        let iconGlow = 'rgba(141, 110, 99, 0.5)';

        if (currentStreak >= 30) {
            tierName = 'Epic/Gold';
            bgGradient = 'linear-gradient(to bottom right, #1a0b2e, #4a148c, #ffd700)'; // Deep purple to Gold
            frameColor = '#ffd700'; // Gold Frame
            iconGlow = 'rgba(255, 215, 0, 0.8)';
        } else if (currentStreak >= 14) {
            tierName = 'Silver';
            bgGradient = 'linear-gradient(to bottom right, #111827, #374151, #9ca3af)'; // Dark slate to Silver
            frameColor = '#e5e7eb'; // Silver Frame
            iconGlow = 'rgba(229, 231, 235, 0.6)';
        } else if (currentStreak >= 4) {
            tierName = 'Bronze';
            bgGradient = 'linear-gradient(to bottom right, #2d2424, #5c3a21, #cd7f32)'; // Bronze shades
            frameColor = '#cd7f32'; // Bronze Frame
            iconGlow = 'rgba(205, 127, 50, 0.6)';
        }

        return new ImageResponse(
            (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: `${imageWidth}px`,
                        height: `${imageHeight}px`,
                        background: bgGradient,
                        position: 'relative',
                        padding: unit(60),
                        color: 'white',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Outer Epic Frame */}
                    <div
                        style={{
                            position: 'absolute',
                            top: unit(40),
                            left: unit(40),
                            right: unit(40),
                            bottom: unit(40),
                            border: `${unit(12)} solid ${frameColor}`,
                            borderRadius: unit(60),
                            display: 'flex',
                            boxShadow: `inset 0 0 100px ${iconGlow}, 0 0 60px ${iconGlow}`,
                            pointerEvents: 'none',
                        }}
                    />

                    {/* Inner Content Wrapper */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            height: '100%',
                            width: '100%',
                            padding: `${unit(80)} ${unit(40)}`,
                            zIndex: 10,
                        }}
                    >
                        {/* Top Section: User Info */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '100%',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: unit(64),
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: unit(4),
                                    textShadow: `0 4px 20px ${iconGlow}`,
                                    marginBottom: unit(16),
                                }}
                            >
                                {username}
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: unit(42),
                                    fontWeight: '600',
                                    color: frameColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: unit(8),
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    padding: `${unit(12)} ${unit(40)}`,
                                    borderRadius: unit(100),
                                    border: `${unit(2)} solid ${frameColor}`,
                                }}
                            >
                                {rank}
                            </div>
                        </div>

                        {/* Middle Section: Main Streak Hero */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'relative',
                                width: unit(800),
                                height: unit(800),
                            }}
                        >
                            {/* Glowing Aura Circle behind number */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: unit(600),
                                    height: unit(600),
                                    backgroundColor: frameColor,
                                    borderRadius: '50%',
                                    filter: `blur(${unit(100)})`,
                                    opacity: 0.3,
                                }}
                            />

                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: unit(80),
                                    fontWeight: '700',
                                    color: 'rgba(255,255,255,0.8)',
                                    textTransform: 'uppercase',
                                    letterSpacing: unit(12),
                                    marginBottom: unit(20),
                                }}
                            >
                                Day Streak
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: unit(380),
                                    fontWeight: '900',
                                    lineHeight: '1',
                                    textShadow: `0 20px 60px ${iconGlow}`,
                                }}
                            >
                                {currentStreak}
                            </div>
                        </div>

                        {/* Bottom Section: Best & Branding */}
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                width: '100%',
                            gap: unit(60),
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: `${unit(40)} ${unit(60)}`,
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    border: `${unit(4)} solid ${frameColor}`,
                                    borderRadius: unit(40),
                                    boxShadow: `0 10px 40px rgba(0,0,0,0.5)`,
                                }}
                            >
                                <div style={{ display: 'flex', fontSize: unit(52), fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>
                                    All-Time Best
                                </div>
                                <div style={{ display: 'flex', fontSize: unit(72), fontWeight: '900', color: frameColor }}>
                                    {bestStreak}
                                </div>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    opacity: 0.6,
                                }}
                            >
                                <div style={{ display: 'flex', fontSize: unit(48), fontWeight: '900', letterSpacing: unit(6) }}> QuestDo </div>
                                <div style={{ display: 'flex', fontSize: unit(32), marginTop: unit(10) }}> LEVEL UP YOUR LIFE </div>
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
    } catch (e: any) {
        console.error(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
