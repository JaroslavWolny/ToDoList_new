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
        const rank = searchParams.get('rank') || 'Zbloudilý nováček';

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
                        width: '1080px',
                        height: '1920px',
                        background: bgGradient,
                        position: 'relative',
                        padding: '60px',
                        color: 'white',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Outer Epic Frame */}
                    <div
                        style={{
                            position: 'absolute',
                            top: '40px',
                            left: '40px',
                            right: '40px',
                            bottom: '40px',
                            border: `12px solid ${frameColor}`,
                            borderRadius: '60px',
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
                            padding: '80px 40px',
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
                                    fontSize: '64px',
                                    fontWeight: '800',
                                    textTransform: 'uppercase',
                                    letterSpacing: '4px',
                                    textShadow: `0 4px 20px ${iconGlow}`,
                                    marginBottom: '16px',
                                }}
                            >
                                {username}
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: '42px',
                                    fontWeight: '600',
                                    color: frameColor,
                                    textTransform: 'uppercase',
                                    letterSpacing: '8px',
                                    backgroundColor: 'rgba(0,0,0,0.4)',
                                    padding: '12px 40px',
                                    borderRadius: '100px',
                                    border: `2px solid ${frameColor}`,
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
                                width: '800px',
                                height: '800px',
                            }}
                        >
                            {/* Glowing Aura Circle behind number */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '600px',
                                    height: '600px',
                                    backgroundColor: frameColor,
                                    borderRadius: '50%',
                                    filter: 'blur(100px)',
                                    opacity: 0.3,
                                }}
                            />

                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: '80px',
                                    fontWeight: '700',
                                    color: 'rgba(255,255,255,0.8)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '12px',
                                    marginBottom: '20px',
                                }}
                            >
                                Day Streak
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    fontSize: '380px',
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
                                gap: '60px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '40px 60px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    border: `4px solid ${frameColor}`,
                                    borderRadius: '40px',
                                    boxShadow: `0 10px 40px rgba(0,0,0,0.5)`,
                                }}
                            >
                                <div style={{ display: 'flex', fontSize: '52px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' }}>
                                    All-Time Best
                                </div>
                                <div style={{ display: 'flex', fontSize: '72px', fontWeight: '900', color: frameColor }}>
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
                                <div style={{ display: 'flex', fontSize: '48px', fontWeight: '900', letterSpacing: '6px' }}> QuestDo </div>
                                <div style={{ display: 'flex', fontSize: '32px', marginTop: '10px' }}> LEVEL UP YOUR LIFE </div>
                            </div>
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1080,
                height: 1920,
            }
        );
    } catch (e: any) {
        console.error(`${e.message}`);
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
