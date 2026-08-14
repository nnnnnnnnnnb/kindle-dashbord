(function (win, doc) {
  'use strict';

  var data = win.ACCOUNTS_DATA || { items: [] };
  var rows = doc.getElementById('accountRows');

  function text(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function percent(value) {
    var number = Number(value);
    return isFinite(number) ? Math.max(0, Math.min(100, Math.round(number))) : null;
  }

  function formatCount(value) {
    var number = Number(value);
    if (!isFinite(number)) return '—';
    if (number >= 1000) return (number / 1000).toFixed(2) + 'K';
    return String(Math.round(number));
  }

  function shortName(value) {
    var name = String(value == null ? '' : value);
    return name.length > 7 ? name.slice(0, 7) + '…' : name;
  }

  function resetText(value) {
    var target = Date.parse(value || '');
    if (!target) return '—';
    var minutes = Math.max(0, Math.ceil((target - Date.now()) / 60000));
    if (!minutes) return '现在';
    var days = Math.floor(minutes / 1440);
    var hours = Math.floor((minutes % 1440) / 60);
    var rest = minutes % 60;
    if (days) return days + '天' + hours + '小时';
    if (hours) return hours + '小时' + rest + '分';
    return rest + '分';
  }

  function remaining(value) {
    var used = percent(value);
    return used == null ? null : Math.max(0, 100 - used);
  }

  function quotaItem(value) {
    var left = remaining(value);
    return '<div class="quota-item">' +
      '<span class="quota-number">' + (left == null ? '—' : left + '%') + '</span>' +
      '<span class="mini-bar"><span style="width:' + (left == null ? 0 : left) + '%"></span></span></div>';
  }

  function quotaBlock(account) {
    var block = doc.createElement('div');
    block.innerHTML = quotaItem(account.weekly);
    return block;
  }

  function renderAccount(account) {
    var row = doc.createElement('article');
    var name = doc.createElement('div');
    var quota = doc.createElement('div');
    var reset = doc.createElement('div');
    var requests = doc.createElement('div');

    row.className = 'account-row' + (isDisabled(account) ? ' disabled' : '');

    name.className = 'name-cell';
    name.innerHTML = '<div class="account-name" title="' + text(account.name) + '">' + text(shortName(account.name)) + '</div>' +
      '<div class="account-id">#' + text(account.id == null ? '—' : account.id) + '</div>';

    quota.className = 'quota-cell';
    quota.appendChild(quotaBlock(account));

    reset.className = 'reset-cell';
    reset.textContent = resetText(account.weeklyResetAt);

    requests.className = 'requests-cell';
    requests.textContent = formatCount(account.weekRequests);

    row.appendChild(name);
    row.appendChild(todayCell(account));
    row.appendChild(quota);
    row.appendChild(reset);
    row.appendChild(requests);
    return row;
  }

  function isDisabled(account) {
    return account.schedulable === false || (account.status && account.status !== 'active');
  }

  function todayCell(account) {
    var cell = doc.createElement('div');
    cell.className = 'today-cell';
    cell.textContent = formatCount(account.todayRequests);
    return cell;
  }

  function normalizeResponse(payload) {
    var source = payload && payload.data ? payload.data : payload;
    var items = source && Array.isArray(source.items) ? source.items : [];
    return {
      total: source && source.total != null ? source.total : items.length,
      items: items.map(function (item) {
        var extra = item.extra || {};
        var group = item.groups && item.groups[0] ? item.groups[0].name : '';
        return {
          id: item.id,
          name: item.name,
          group: group,
          status: item.status,
          fiveHour: extra.codex_5h_used_percent,
          weekly: extra.codex_7d_used_percent,
          fiveHourResetAt: extra.codex_5h_reset_at,
          weeklyResetAt: extra.codex_7d_reset_at,
          todayRequests: item.todayRequests == null ? (item.today_request_count == null ? item.today && item.today.requests : item.today_request_count) : item.todayRequests,
          weekRequests: item.weekRequests == null ? (item.week_request_count == null ? item.weekly_request_count : item.week_request_count) : item.weekRequests,
          schedulable: item.schedulable
        };
      })
    };
  }

  function mergeBatchData(accountPayload, usagePayload, todayPayload) {
    var normalized = normalizeResponse(accountPayload);
    var usageRoot = usagePayload && usagePayload.data ? usagePayload.data : usagePayload || {};
    var usage = usageRoot.usage || {};
    var todayRoot = todayPayload && todayPayload.data ? todayPayload.data : todayPayload || {};
    var today = todayRoot.stats || {};

    normalized.items.forEach(function (account) {
      var byWindow = usage[String(account.id)] || {};
      var fiveHour = byWindow.five_hour || {};
      var sevenDay = byWindow.seven_day || {};
      var todayStats = today[String(account.id)] || {};
      var sevenStats = sevenDay.window_stats || {};

      account.fiveHour = fiveHour.utilization;
      account.weekly = sevenDay.utilization;
      account.fiveHourResetAt = fiveHour.resets_at;
      account.weeklyResetAt = sevenDay.resets_at;
      account.todayRequests = todayStats.requests;
      account.weekRequests = sevenStats.requests;
    });
    return normalized;
  }

  win.renderAccountsResponse = function (payload) {
    data = normalizeResponse(payload);
    render();
  };

  // Merge the three admin responses without exposing the admin key in the page.
  win.renderAccountBatches = function (accountPayload, usagePayload, todayPayload) {
    data = mergeBatchData(accountPayload, usagePayload, todayPayload);
    render();
  };

  function render() {
    var items = data.items || [];
    items = items.slice().sort(function (left, right) {
      return Number(isDisabled(left)) - Number(isDisabled(right));
    });
    rows.textContent = '';
    items.forEach(function (account) { rows.appendChild(renderAccount(account)); });
  }

  render();
}(window, document));
