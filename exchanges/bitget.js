// exchanges/bitget.js
// Import WebSocket library
import WebSocket from 'ws';
// Import function to update prices from spread.js
import { updatePrice } from '../spread/spread.js';

/**
 * Subscribe to Bitget tickers
 * @param {string[]} symbols - array of trading pairs (e.g. ['BTCUSDT', 'ETHUSDT'])
 */
export function subscribeBitgetTickers(symbols = []) {
    // Create connection to Bitget public WebSocket (SPOT market)
    const ws = new WebSocket('wss://ws.bitget.com/v2/ws/public');

    // Event: connection established
    ws.on('open', () => {
        console.log('[Bitget] ✅ WebSocket connected');

        // Build subscription message
        const subscribeMsg = {
            op: 'subscribe',
            args: symbols.map(symbol => ({
                instType: 'SPOT',   // Instrument type: SPOT
                channel: 'ticker',  // Channel: ticker
                instId: symbol      // Symbol, e.g. BTCUSDT
            }))
        };

        // Send subscription request
        ws.send(JSON.stringify(subscribeMsg));

        // Set up ping interval (every 30 seconds)
        ws._pingInterval = setInterval(() => {
            ws.send('ping');
        }, 30000);
    });

    // Event: incoming messages from server
    ws.on('message', (raw) => {
        const msg = raw.toString();

        // Server responds to ping with "pong" → ignore
        if (msg === 'pong') return;

        let data;
        try {
            // Try parsing message as JSON
            data = JSON.parse(msg);
        } catch {
            // If it's not JSON → ignore
            return;
        }

        // Check if it's a ticker update and contains price
        if (data.arg?.channel === 'ticker' && data.data?.[0]?.lastPr) {
            const symbol = data.arg.instId;                   // Symbol
            const price = parseFloat(data.data[0].lastPr);    // Last price

            // If price is valid → update spread module
            if (!isNaN(price)) {
                updatePrice('BITGET', symbol, price);
            }
        }
    });

    // Event: connection closed
    ws.on('close', () => {
        // Clear ping interval
        clearInterval(ws._pingInterval);

        // Try unsubscribing from channels (may fail if socket is already closed)
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

        // Try to reconnect after 1 second
        setTimeout(() => subscribeBitgetTickers(symbols), 1000);
    });

    // Event: WebSocket error
    ws.on('error', (err) => {
        console.error('[Bitget] ❌ WebSocket error:', err.message);

        // Close socket (this will trigger `on('close')` and reconnect)
        ws.close();
    });
}
