// exchanges/bitget.js
import WebSocket from 'ws';
import { updatePrice } from '../spread/spread.js';

export function subscribeBitgetTickers(symbols = []) {
    const ws = new WebSocket('wss://ws.bitget.com/v2/ws/public');

    ws.on('open', () => {
        console.log('[Bitget] ✅ WebSocket connected');

        const subscribeMsg = {
            op: 'subscribe',
            args: symbols.map(symbol => ({
                instType: 'SPOT',
                channel: 'ticker',
                instId: symbol
            }))
        };

        ws.send(JSON.stringify(subscribeMsg));

        ws._pingInterval = setInterval(() => {
            ws.send('ping');
        }, 30000);
    });

    ws.on('message', (raw) => {
        const msg = raw.toString();
        if (msg === 'pong') return;

        let data;
        try {
            data = JSON.parse(msg);
        } catch {
            return;
        }

        if (data.arg?.channel === 'ticker' && data.data?.[0]?.lastPr) {
            const symbol = data.arg.instId;
            const price = parseFloat(data.data[0].lastPr);
            if (!isNaN(price)) {
                updatePrice('BITGET', symbol, price);
            }
        }
    });

    ws.on('close', () => {
        clearInterval(ws._pingInterval);
        // Попробуй отписаться
        try {
            const unsubscribeMsg = {
                op: 'unsubscribe',
                args: symbols.map(symbol => ({
                    instType: 'SPOT',
                    channel: 'ticker',
                    instId: symbol
                }))
            };
            ws.send(JSON.stringify(unsubscribeMsg));
        } catch {}
        console.log('[Bitget] ⚠️ Connection closed — reconnecting...');
        setTimeout(() => subscribeBitgetTickers(symbols), 1000);
    });

    ws.on('error', (err) => {
        console.error('[Bitget] ❌ WebSocket error:', err.message);
        ws.close();
    });
}
