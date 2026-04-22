const fetch = require('node-fetch');
const https = require('https');
const { query, queryOne, execute, isPg } = require('../db/database');

// baotinmanhhai.vn uses intermediate cert not trusted by Node.js by default
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

async function fetchFromGraphQL(gqlQuery) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Origin': 'https://baotinmanhhai.vn',
      'Referer': 'https://baotinmanhhai.vn/vi/bang-gia-vang',
    },
    body: JSON.stringify({ query: gqlQuery }),
    agent: httpsAgent,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

async function fetchAndCacheRates() {
  try {
    const data  = await fetchFromGraphQL(GOLD_RATES_QUERY);
    const rates = data.goldRates?.items;
    if (!rates || !rates.length) return;

    for (const r of rates) {
      await execute(
        `INSERT INTO gold_prices (code, name, vendor_name, buy_price, sell_price, trend, unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [r.code, r.name, r.vendor_name || '', r.buy_price, r.sell_price, r.trend || 'neutral', r.unit || '']
      );
    }

    console.log(`[GoldService] Fetched and cached ${rates.length} gold rates`);
    return rates;
  } catch (err) {
    console.error('fetchAndCacheRates error:', err.message);
    throw err;
  }
}

async function fetchAndCacheChart(code) {
  try {
    const data      = await fetchFromGraphQL(buildChartQuery(code));
    const chartData = data.goldChartData;
    if (!chartData) return null;

    await execute(
      `INSERT INTO gold_chart_cache (code, data, fetched_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT(code) DO UPDATE SET data = EXCLUDED.data, fetched_at = CURRENT_TIMESTAMP`,
      [code || 'ALL', JSON.stringify(chartData)]
    );

    return chartData;
  } catch (err) {
    console.error('fetchAndCacheChart error:', err.message);
    throw err;
  }
}

async function getLatestRates() {
  return query(`
    SELECT g.*
    FROM gold_prices g
    INNER JOIN (
      SELECT code, MAX(fetched_at) AS max_at
      FROM gold_prices
      GROUP BY code
    ) latest ON g.code = latest.code AND g.fetched_at = latest.max_at
    ORDER BY g.name
  `);
}

async function getCachedChart(code) {
  return queryOne(
    'SELECT data, fetched_at FROM gold_chart_cache WHERE code = $1',
    [code || 'ALL']
  );
}

async function getHistoricalRates(code, days = 30) {
  // Compute cutoff date in JS so it works the same for SQLite and PostgreSQL
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return query(
    `SELECT code, name, buy_price, sell_price, trend, fetched_at
     FROM gold_prices
     WHERE code = $1 AND fetched_at >= $2
     ORDER BY fetched_at ASC`,
    [code, cutoff]
  );
}

module.exports = {
  fetchAndCacheRates,
  fetchAndCacheChart,
  getLatestRates,
  getCachedChart,
  getHistoricalRates,
};
