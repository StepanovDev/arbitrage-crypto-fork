import { subscribeBitgetTickers } from './exchanges/bitget.js';
import { subscribeGateTickers } from './exchanges/gateio.js';
import { trackSymbols } from './spread/spread.js';

const SYMBOLS = ['ARBUSDT', 'SUIUSDT', 'OPUSDT', 'FETUSDT', 'APTUSDT'];
const GATE_SYMBOLS = ['ARB_USDT', 'SUI_USDT', 'OP_USDT', 'FET_USDT', 'APT_USDT'];

subscribeBitgetTickers(SYMBOLS);
subscribeGateTickers(GATE_SYMBOLS);
trackSymbols(SYMBOLS);
