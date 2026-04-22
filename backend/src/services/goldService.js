const fetch = require('node-fetch');
const https = require('https');
const { getDb } = require('../db/database');

// baotinmanhhai.vn dùng intermediate cert không được Node.js trust mặc định
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

const GRAPHQL_URL = 'https://baotinmanhhai.vn/api/graphql';

const GOLD_RATES_QUERY = `
  query {
    goldRates {
      items {
        name
        code
        buy_price
        sell_price
        unit
        vendor_name
        trend
        last_updated
      }
    }
  }
`;

function buildChartQuery(code) {
  const targetCode = code || 'SJC9999';
  return `
    query {
      goldChartData(code: "${targetCode}") {
        data_points { date buy sell }
        default_product
        product_options { value label }
      }
    }
  `;
}

async function fetchFromGraphQL(query, variables = {}) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Origin': 'https://baotinmanhhai.vn',
      'Referer': 'https://baotinmanhhai.vn/vi/bang-gia-vang',
    },
    body: JSON.stringify({ query, variables }),
    agent: httpsAgent,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

async function fetchAndCacheRates() {
  try {
    const data = await fetchFromGraphQL(GOLD_RATES_QUERY);
    const rates = data.goldRates?.items;
    if (!rates || !rates.length) return;

    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO gold_prices (code, name, vendor_name, buy_price, sell_price, trend, unit)
      VALUES (@code, @name, @vendor_name, @buy_price, @sell_price, @trend, @unit)
    `);

    const insertMany = db.transaction((items) => {
      for (const r of items) insert.run(r);
    });

    insertMany(rates.map(r => ({
      code: r.code,
      name: r.name,
      vendor_name: r.vendor_name || '',
      buy_price: r.buy_price,
      sell_price: r.sell_price,
      trend: r.trend || 'neutral',
      unit: r.unit || '',
    })));

    console.log(`[${new Date().toISOString()}] Fetched ${rates.length} gold rates`);
    return rates;
  } catch (err) {
    console.error('fetchAndCacheRates error:', err.message);
    throw err;
  }
}

async function fetchAndCacheChart(code) {
  try {
    const data = await fetchFromGraphQL(buildChartQuery(code));
    const chartData = data.goldChartData;
    if (!chartData) return null;

    const db = getDb();
    db.prepare(`
      INSERT INTO gold_chart_cache (code, data, fetched_at)
      VALUES (@code, @data, CURRENT_TIMESTAMP)
      ON CONFLICT(code) DO UPDATE SET data = @data, fetched_at = CURRENT_TIMESTAMP
    `).run({ code: code || 'ALL', data: JSON.stringify(chartData) });

    return chartData;
  } catch (err) {
    console.error('fetchAndCacheChart error:', err.message);
    throw err;
  }
}

function getLatestRates() {
  const db = getDb();
  return db.prepare(`
    SELECT g.*
    FROM gold_prices g
    INNER JOIN (
      SELECT code, MAX(fetched_at) as max_at
      FROM gold_prices
      GROUP BY code
    ) latest ON g.code = latest.code AND g.fetched_at = latest.max_at
    ORDER BY g.name
  `).all();
}

function getCachedChart(code) {
  const db = getDb();
  return db.prepare(`SELECT data, fetched_at FROM gold_chart_cache WHERE code = ?`)
    .get(code || 'ALL');
}

function getHistoricalRates(code, days = 30) {
  const db = getDb();
  return db.prepare(`
    SELECT code, name, buy_price, sell_price, trend, fetched_at
    FROM gold_prices
    WHERE code = ? AND fetched_at >= datetime('now', '-' || ? || ' days')
    ORDER BY fetched_at ASC
  `).all(code, days);
}

module.exports = {
  fetchAndCacheRates,
  fetchAndCacheChart,
  getLatestRates,
  getCachedChart,
  getHistoricalRates,
};
