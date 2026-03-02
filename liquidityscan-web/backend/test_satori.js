const satori = require('satori').default;
const { html } = require('satori-html');
const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

async function testCard() {
    const symbol = 'BTCUSDT';
    const strategyType = 'STRATEGY_1';
    const timeframe = '5m';
    const signalType = 'BUY_SIGNAL';
    const price = 64230.5;

    const fontBuffer = fs.readFileSync(path.join(__dirname, 'src/telegram/Roboto-Bold.ttf'));

    const isBuy = signalType.includes('BUY');
    const color = isBuy ? '#13ec37' : '#ff3b30';
    const bgGradientStart = isBuy ? '#0a1f0f' : '#1f0a0a';

    const markup = html`
        <div style="display: flex; flex-direction: column; width: 800px; height: 418px; background: linear-gradient(135deg, #0b140d 0%, ${bgGradientStart} 100%); color: white; padding: 40px; font-family: 'Roboto'; border: 3px solid ${color}; box-sizing: border-box; border-radius: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; width: 100%;">
                <div style="display: flex; align-items: center;">
                    <span style="font-size: 28px; font-weight: bold; color: rgba(255,255,255,0.6); margin-right: 10px;">LIQUIDITY</span>
                    <span style="font-size: 28px; font-weight: bold; color: white;">SCANNER</span>
                </div>
                <div style="display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 8px 20px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.1);">
                    <span style="font-size: 20px; color: ${color}; font-weight: bold; margin-right: 12px;">●</span>
                    <span style="font-size: 20px; color: rgba(255,255,255,0.9);">${strategyType.replace('_', ' ')}</span>
                </div>
            </div>
            
            <div style="display: flex; flex-direction: column; flex-grow: 1; justify-content: center; align-items: center; width: 100%;">
                <div style="display: flex; font-size: 96px; font-weight: bold; letter-spacing: -3px; margin-bottom: 5px; color: white;">
                    ${symbol}
                </div>
                <div style="display: flex; font-size: 48px; font-weight: bold; color: ${color}; letter-spacing: 4px; text-shadow: 0 0 20px ${color}40;">
                    ${signalType.replace('_SIGNAL', '')}
                </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 25px;">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 18px; color: rgba(255,255,255,0.5); margin-bottom: 5px; letter-spacing: 1px;">ENTRY PRICE</span>
                    <span style="font-size: 40px; font-weight: bold; color: white;">$${price}</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                    <span style="font-size: 18px; color: rgba(255,255,255,0.5); margin-bottom: 5px; letter-spacing: 1px;">TIMEFRAME</span>
                    <span style="font-size: 40px; font-weight: bold; color: white;">${timeframe}</span>
                </div>
            </div>
        </div>
    `;

    const svg = await satori(markup, {
        width: 800,
        height: 418,
        fonts: [
            {
                name: 'Roboto',
                data: fontBuffer,
                weight: 700,
                style: 'normal',
            }
        ],
    });

    const resvg = new Resvg(svg, {
        background: '#0b140d',
    });

    const pngData = resvg.render();
    fs.writeFileSync('test_satori.png', pngData.asPng());
    console.log('Saved to test_satori.png');
}

testCard().catch(console.error);
