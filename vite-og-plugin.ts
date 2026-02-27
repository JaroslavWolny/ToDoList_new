import fs from 'fs';
import path from 'path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

// Dummy implementation of React elements for Satori without importing React
// Satori accepts objects with type, props, children
// But actually, we can just compile JSX or use plain objects
// To make it simple, we construct the object tree directly or use a helper
function h(type: string, props: any, ...children: any[]) {
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
            width: '1080px',
            height: '1920px',
            background: bgGradient,
            position: 'relative',
            padding: '60px',
            color: 'white',
            boxSizing: 'border-box',
        }
    },
        h('div', {
            style: {
                position: 'absolute',
                top: '40px', left: '40px', right: '40px', bottom: '40px',
                border: `12px solid ${frameColor}`,
                borderRadius: '60px',
                display: 'flex',
            }
        }),
        h('div', {
            style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
                height: '100%', width: '100%', padding: '80px 40px',
            }
        },
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' } },
                h('div', { style: { display: 'flex', fontSize: '64px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '4px', marginBottom: '16px' } }, username),
                h('div', { style: { display: 'flex', fontSize: '42px', fontWeight: '600', color: frameColor, textTransform: 'uppercase', letterSpacing: '8px', backgroundColor: 'rgba(0,0,0,0.4)', padding: '12px 40px', borderRadius: '100px', border: `2px solid ${frameColor}` } }, rank)
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '800px', height: '800px' } },
                h('div', { style: { display: 'flex', fontSize: '80px', fontWeight: '700', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '12px', marginBottom: '20px' } }, 'Day Streak'),
                h('div', { style: { display: 'flex', fontSize: '380px', fontWeight: '900', lineHeight: '1' } }, String(currentStreak))
            ),
            h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '60px' } },
                h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '40px 60px', backgroundColor: 'rgba(0, 0, 0, 0.5)', border: `4px solid ${frameColor}`, borderRadius: '40px' } },
                    h('div', { style: { display: 'flex', fontSize: '52px', fontWeight: 'bold', color: 'rgba(255,255,255,0.7)' } }, 'All-Time Best'),
                    h('div', { style: { display: 'flex', fontSize: '72px', fontWeight: '900', color: frameColor } }, String(bestStreak))
                ),
                h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6 } },
                    h('div', { style: { display: 'flex', fontSize: '48px', fontWeight: '900', letterSpacing: '6px' } }, 'QuestDo'),
                    h('div', { style: { display: 'flex', fontSize: '32px', marginTop: '10px' } }, 'LEVEL UP YOUR LIFE')
                )
            )
        )
    );

    // We must supply a font buffer for Satori
    // Since we don't have Inter TTF locally, we'll fetch it on runtime inside the Vite plugin, or load a system font.
    // Let's fetch it from google fonts or unpkg.
    const fontResponse = await fetch('https://unpkg.com/inter-ui/Inter%20(web)/fonts/Inter-Bold.woff');
    const fontBuffer = await fontResponse.arrayBuffer();

    const svg = await satori(element as any, {
        width: 1080,
        height: 1920,
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
