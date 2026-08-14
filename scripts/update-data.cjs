'use strict';

const fs = require('node:fs');
const path = require('node:path');

const baseUrl = String(process.env.SUB2API_BASE_URL || 'http://sub2api.raycloud.cn').replace(/\/+$/, '');
const adminKey = String(process.env.SUB2API_ADMIN_KEY || '').trim();
const configuredIds = String(process.env.SUB2API_ACCOUNT_IDS || '')
  .split(',')
  .map((value) => Number(value.trim()))
  // 0/负数作为“不过滤”或无效占位值处理，避免把全部账号筛空。
  .filter((value) => Number.isInteger(value) && value > 0);

if (!adminKey) {
  throw new Error('缺少 SUB2API_ADMIN_KEY。请只在本地环境变量中设置管理员 Key。');
}

const headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'X-Admin-UI-Request': '1',
  'x-api-key': adminKey,
};

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const payload = await response.json();
  if (!response.ok || payload.code !== 0) {
    throw new Error(`${pathname} 请求失败：HTTP ${response.status} ${payload.message || ''}`.trim());
  }
  return payload;
}

function responseData(payload) {
  return payload && payload.data !== undefined ? payload.data : payload;
}

function responseItems(payload) {
  const data = responseData(payload);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.records)) return data.records;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function responsePageCount(payload, itemCount) {
  const data = responseData(payload) || {};
  const explicitPages = Number(data.pages ?? data.total_pages ?? payload?.pages);
  if (Number.isInteger(explicitPages) && explicitPages > 0) return explicitPages;

  const total = Number(data.total ?? payload?.total);
  const pageSize = Number(data.page_size ?? data.pageSize ?? payload?.page_size ?? payload?.pageSize);
  if (Number.isFinite(total) && Number.isFinite(pageSize) && pageSize > 0) {
    return Math.max(1, Math.ceil(total / pageSize));
  }
  return itemCount > 0 ? 1 : 0;
}

async function fetchAccounts() {
  const items = [];
  let page = 1;
  let pages = 1;
  do {
    const query = new URLSearchParams({
      page: String(page),
      page_size: '100',
      lite: '1',
      sort_by: 'name',
      sort_order: 'asc',
    });
    const payload = await request(`/api/v1/admin/accounts?${query}`);
    const pageItems = responseItems(payload);
    items.push(...pageItems);
    pages = responsePageCount(payload, pageItems.length);
    if (!pageItems.length) break;
    page += 1;
  } while (page <= pages);
  return items;
}

function post(pathname, body) {
  return request(pathname, { method: 'POST', body: JSON.stringify(body) });
}

function pickAccounts(payload) {
  const items = responseItems(payload);
  const usage = payload.usage || {};
  const today = payload.today || {};
  return items.map((item) => {
    const byWindow = usage[String(item.id)] || {};
    const fiveHour = byWindow.five_hour || {};
    const sevenDay = byWindow.seven_day || {};
    const todayStats = today[String(item.id)] || {};
    return {
      id: item.id,
      name: item.name,
      group: item.groups?.[0]?.name || '',
      status: item.status || '',
      schedulable: item.schedulable !== false,
      todayRequests: todayStats.requests ?? null,
      weekRequests: sevenDay.window_stats?.requests ?? null,
      fiveHour: fiveHour.utilization ?? null,
      weekly: sevenDay.utilization ?? null,
      fiveHourResetAt: fiveHour.resets_at || null,
      weeklyResetAt: sevenDay.resets_at || null,
    };
  });
}

async function main() {
  const allAccounts = await fetchAccounts();
  const filter = configuredIds.length ? new Set(configuredIds) : null;
  const selectedAccounts = filter
    ? allAccounts.filter((item) => filter.has(Number(item.id)))
    : allAccounts;
  const accountIds = selectedAccounts
    .map((item) => Number(item.id))
    .filter(Number.isInteger);
  if (!allAccounts.length) {
    throw new Error('账号列表接口未返回任何账号，未请求用量接口。请检查管理员 Key、接口地址和账号接口响应。');
  }
  if (!accountIds.length) {
    const requested = filter ? [...filter].join(',') : '接口返回的账号 ID 无效';
    throw new Error(`${filter ? `SUB2API_ACCOUNT_IDS 未匹配到账号（${requested}）` : requested}，未请求用量接口。请清除该变量或改用有效账号 ID。`);
  }
  const usage = await post('/api/v1/admin/accounts/usage/batch', { account_ids: accountIds, force: true });
  const today = await post('/api/v1/admin/accounts/today-stats/batch', { account_ids: accountIds });
  const payload = {
    // 记录本次用量请求完成时间，页面展示它而不是页面打开时间。
    updatedAt: new Date().toISOString(),
    total: accountIds.length,
    items: pickAccounts({
      data: { items: selectedAccounts },
      usage: usage.data?.usage || {},
      today: today.data?.stats || {},
    }),
  };
  const output = `/* generated locally; do not add API keys */\nwindow.ACCOUNTS_DATA = ${JSON.stringify(payload, null, 2)};\n`;
  const outputPath = path.join(__dirname, '..', 'web', 'accounts-data.js');
  fs.writeFileSync(outputPath, output, 'utf8');
  process.stdout.write(`updated ${payload.items.length} accounts in ${outputPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
