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

export async function generateOGImage(url: string) {
    const searchParams = new URL(url, 'http://localhost').searchParams;
    const username = searchParams.get('username') || 'Quester';
    const currentStreak = parseInt(searchParams.get('streak') || '0', 10);
    const bestStreak = parseInt(searchParams.get('best') || '0', 10);
    const rank = searchParams.get('rank') || 'Novice Voyager';

    const requestedWidth = parseInt(searchParams.get('w') || '1080', 10);
    const requestedHeight = parseInt(searchParams.get('h') || '1920', 10);
    const imageWidth = Number.isFinite(requestedWidth) ? Math.min(Math.max(requestedWidth, 720), 1440) : 1080;
    const imageHeight = Number.isFinite(requestedHeight) ? Math.min(Math.max(requestedHeight, 1280), 3200) : 1920;
    const unit = (value: number) => `${Math.round((value * imageWidth) / 1080)}px`;

    let tierName = 'Wood';
    let bgGradient = 'linear-gradient(to bottom right, #5c4033, #3e2723, #1b0000)';
    let frameColor = '#8d6e63';
    let iconGlow = 'rgba(141, 110, 99, 0.5)';

    if (currentStreak >= 30) {
        tierName = 'Epic/Gold';
        bgGradient = 'linear-gradient(to bottom right, #1a0b2e, #4a148c, #ffd700)';
        frameColor = '#ffd700';
        iconGlow = 'rgba(255, 215, 0, 0.8)';
    } else if (currentStreak >= 14) {
        tierName = 'Silver';
        bgGradient = 'linear-gradient(to bottom right, #111827, #374151, #9ca3af)';
        frameColor = '#e5e7eb';
        iconGlow = 'rgba(229, 231, 235, 0.6)';
    } else if (currentStreak >= 4) {
        tierName = 'Bronze';
        bgGradient = 'linear-gradient(to bottom right, #2d2424, #5c3a21, #cd7f32)';
        frameColor = '#cd7f32';
        iconGlow = 'rgba(205, 127, 50, 0.6)';
    }

    const element = h('div', {
        style: {
            display: 'flex',
            flexDirection: 'column',
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
            background: bgGradient,
            position: 'relative',
            padding: unit(60),
            color: 'white',
            boxSizing: 'border-box',
        }
    },
        h('div', {
            style: {
                position: 'absolute',
                top: unit(40), left: unit(40), right: unit(40), bottom: unit(40),
                border: `${unit(12)} solid ${frameColor}`,
                borderRadius: unit(60),
                display: 'flex',
                boxShadow: `inset 0 0 100px ${iconGlow}, 0 0 60px ${iconGlow}`,
            }
        }),
        h('div', {
            style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                height: '100%', width: '100%', padding: `${unit(80)} ${unit(40)}`,
            }
        },
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' } },
                h('div', { style: { display: 'flex', fontSize: unit(64), fontWeight: '800', textTransform: 'uppercase', letterSpacing: unit(4), marginBottom: unit(16), textShadow: `0 4px 20px ${iconGlow}` } }, username),
                h('div', { style: { display: 'flex', fontSize: unit(42), fontWeight: '600', color: frameColor, textTransform: 'uppercase', letterSpacing: unit(8), backgroundColor: 'rgba(0,0,0,0.4)', padding: `${unit(12)} ${unit(40)}`, borderRadius: unit(100), border: `${unit(2)} solid ${frameColor}` } }, rank),
                h('div', { style: { display: 'flex', marginTop: unit(14), fontSize: unit(26), fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: unit(3) } }, `Tier: ${tierName}`)
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', width: unit(800), height: unit(800) } },
                h('div', { style: { display: 'flex', fontSize: unit(80), fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: unit(12), marginBottom: unit(20) } }, 'Day Streak'),
                h('div', { style: { display: 'flex', fontSize: unit(380), fontWeight: '900', lineHeight: '1', textShadow: `0 20px 60px ${iconGlow}` } }, String(currentStreak))
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: unit(60) } },
                h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: `${unit(40)} ${unit(60)}`, backgroundColor: 'rgba(0, 0, 0, 0.5)', border: `${unit(4)} solid ${frameColor}`, borderRadius: unit(40) } },
                    h('div', { style: { display: 'flex', fontSize: unit(52), fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' } }, 'All-Time Best'),
                    h('div', { style: { display: 'flex', fontSize: unit(72), fontWeight: '900', color: frameColor } }, String(bestStreak))
                ),
                h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6 } },
                    h('div', { style: { display: 'flex', fontSize: unit(48), fontWeight: '900', letterSpacing: unit(6) } }, 'QuestDo'),
                    h('div', { style: { display: 'flex', fontSize: unit(32), marginTop: unit(10) } }, 'LEVEL UP YOUR LIFE')
                )
            )
        )
    );

    const fontResponse = await fetch('https://unpkg.com/inter-ui/Inter%20(web)/fonts/Inter-Bold.woff');
    const fontBuffer = await fontResponse.arrayBuffer();

    const svg = await satori(element as unknown as ReactNode, {
        width: imageWidth,
        height: imageHeight,
        fonts: [
            {
                name: 'Inter',
                data: fontBuffer,
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
