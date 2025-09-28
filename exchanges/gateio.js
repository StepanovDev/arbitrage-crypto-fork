// exchanges/gateio.js
import WebSocket from 'ws';
import { updatePrice } from '../spread/spread.js';

export function subscribeGateTickers(symbols = []) {
    const ws = new WebSocket('wss://api.gateio.ws/ws/v4/');

    ws.on('open', () => {
        console.log('[Gate.io] ✅ WebSocket connected');

        const msg = {
            time: Math.floor(Date.now() / 1000),
            channel: 'spot.tickers',
            event: 'subscribe',
            payload: symbols
        };

        ws.send(JSON.stringify(msg));
    });

    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw);
        } catch {
            return;
        }

        if (msg.channel === 'spot.tickers' && msg.result?.currency_pair && msg.result?.last) {
            const symbol = msg.result.currency_pair.toUpperCase().replace('_', '');
            const price = parseFloat(msg.result.last);
            if (!isNaN(price)) {
                updatePrice('GATE', symbol, price);
            }
        }

        if (msg.event === 'subscribe') {
            console.log(`[Gate.io] ✅ Subscribed to ${msg.payload?.join(', ')}`);
        }
    });

    ws.on('error', (err) => {
        console.error('[Gate.io] ❌ WebSocket error:', err.message);
    });

    ws.on('close', () => {
        clearInterval(ws._pingInterval);
        console.log('[Gate.io] ⚠️ Connection closed');
    });

}
