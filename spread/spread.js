// spread/spread.js
// ✅ Timestamp-логика без фаз "bitget → gate"
// Совместимо с текущими exchanges/*.js

// Настройки (при желании вынеси в .env / config)
const CHECK_INTERVAL_MS = 5000;   // как часто проверяем спреды
const MAX_SKEW_MS       = 1000;   // макс. разница во времени между котировками для сравнения
const MAX_AGE_MS        = 5000;   // макс. "возраст" котировки (чтобы не считать со старыми данными)
const ALERT_SPREAD_PCT  = 0.05;   // порог спреда в процентах (0.05% = 0.05)

// Внутреннее хранилище
const TARGET_PAIRS = new Set();
const prices = {
    BITGET: Object.create(null), // symbol -> { price, ts }
    GATE:   Object.create(null),
};

let checkerHandle = null;

export function trackSymbols(symbols = []) {
    TARGET_PAIRS.clear();
    for (const s of symbols) TARGET_PAIRS.add(s);

    // Перезапускаем таймер проверки
    if (checkerHandle) clearInterval(checkerHandle);
    console.log(`[SPREAD] ▶ Tracking: ${[...TARGET_PAIRS].join(', ')}`);
    checkerHandle = setInterval(runCheck, CHECK_INTERVAL_MS);
}

export function updatePrice(source, symbol, price) {
    // Сохраняем только те пары, что отслеживаем
    if (!TARGET_PAIRS.has(symbol)) return;
    const p = Number(price);
    if (!Number.isFinite(p)) return;

    const now = Date.now();
    prices[source] ??= Object.create(null);
    prices[source][symbol] = { price: p, ts: now };
    // Можно раскомментировать для подробного лога:
    // console.log(`[${source}] ${symbol} @ ${p} (${new Date(now).toISOString()})`);
}

function runCheck() {
    const now = Date.now();
    console.log(`\n[SPREAD] 🔍 Checking (${new Date(now).toISOString()})`);

    for (const symbol of TARGET_PAIRS) {
        const b = prices.BITGET[symbol];
        const g = prices.GATE[symbol];

        if (!b || !g) {
            // Не все источники прислали цену
            // console.log(`ℹ️ ${symbol}: ждём вторую сторону`);
            continue;
        }

        const ageB = now - b.ts;
        const ageG = now - g.ts;
        const skew = Math.abs(b.ts - g.ts);

        // Отбрасываем слишком старые или несинхронные котировки
        if (ageB > MAX_AGE_MS || ageG > MAX_AGE_MS) {
            // console.log(`⚠️ ${symbol}: устаревшие данные (B:${ageB}ms, G:${ageG}ms)`);
            continue;
        }
        if (skew > MAX_SKEW_MS) {
            // console.log(`⚠️ ${symbol}: рассинхрон по времени ${skew}ms`);
            continue;
        }

        const spreadPct = pctSpread(b.price, g.price);
        if (spreadPct >= ALERT_SPREAD_PCT) {
            console.log(
                `🚨 ${symbol}: Bitget ${b.price} | Gate.io ${g.price} | ` +
                `Spread: ${spreadPct.toFixed(3)}% | skew ${skew}ms`
            );
        } else {
            // Скрытый "зелёный" лог при желании:
            // console.log(`✅ ${symbol}: ${spreadPct.toFixed(3)}% (skew ${skew}ms)`);
        }
    }
}

function pctSpread(p1, p2) {
    // Абсолютная разница / средняя цена * 100
    const mid = (p1 + p2) / 2;
    if (mid === 0) return 0;
    return Math.abs(p1 - p2) / mid * 100;
}
