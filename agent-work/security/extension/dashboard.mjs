import { api } from './api.mjs';
import { summarize, report } from './engine.mjs';
const $ = (id) => document.getElementById(id);
let data = { session: null, history: [] };
function render() {
  const s = summarize(data.history, Number($('period').value));
  $('total-time').textContent =
    `${Math.floor(s.seconds / 3600)}h ${Math.floor((s.seconds % 3600) / 60)}m`;
  $('completed').textContent = `${s.completed} / ${s.sessions}`;
  $('attempts').textContent = s.attempts;
  $('completion').textContent =
    s.completionRate === null ? '—' : s.completionRate + '%';
  $('outcomes').textContent = `${s.escaped} exits · ${s.recovered} recoveries`;
  $('current').hidden = !data.session;
  if (data.session)
    $('current').textContent = 'In progress · ' + data.session.task;
  $('daily-chart').replaceChildren();
  const max = Math.max(1, ...s.daily.map((d) => d.minutes));
  for (const d of s.daily) {
    const column = document.createElement('div');
    column.className = 'chart-column';
    column.title = `${d.label}: ${d.minutes} minutes`;
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${(d.minutes / max) * 100}%`;
    column.append(bar);
    $('daily-chart').append(column);
  }
  $('daily-chart').setAttribute(
    'aria-label',
    s.daily.map((d) => `${d.label}: ${d.minutes} minutes`).join('; '),
  );
  $('empty-note').textContent = s.sessions
    ? 'Minutes per day. All-time view shows the last 30 days in this chart.'
    : 'Finish a session to see your daily minutes here.';
  $('domains').replaceChildren();
  for (const [domain, count] of s.domains.slice(0, 8)) {
    const row = document.createElement('p');
    row.className = 'domain-stat';
    const name = document.createElement('span');
    name.textContent = domain;
    const n = document.createElement('strong');
    n.textContent = count;
    row.append(name, n);
    $('domains').append(row);
  }
  if (!s.domains.length)
    $('domains').textContent = 'No distractions recorded in this period.';
  $('history').replaceChildren();
  for (const session of s.rows.slice(0, 30)) {
    const r = report(session);
    const row = document.createElement('details');
    const title = document.createElement('summary');
    title.textContent = `${r.task} · ${Math.floor(r.seconds / 60)} min`;
    const detail = document.createElement('p');
    detail.textContent = `${new Date(session.startedAt).toLocaleDateString()} · ${r.status} · ${r.attempts} attempts stopped · ${r.accessRequests} access requests`;
    row.append(title, detail);
    $('history').append(row);
  }
  if (!s.rows.length)
    $('history').textContent = 'Completed sessions will appear here.';
  $('clear').disabled = !!data.session;
}
async function refresh() {
  try {
    const response = await api.runtime.sendMessage({ type: 'get' });
    if (response.error) throw Error(response.error);
    data = response.data;
    render();
    $('feedback').textContent = '';
  } catch (e) {
    $('feedback').textContent = e.message;
  }
}
$('period').addEventListener('change', render);
$('refresh').addEventListener('click', refresh);
$('export').addEventListener('click', () => {
  const href = URL.createObjectURL(
    new Blob([JSON.stringify({ version: 1, ...data }, null, 2)], {
      type: 'application/json',
    }),
  );
  const a = document.createElement('a');
  a.href = href;
  a.download = 'lock-in-data.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
});
$('clear').addEventListener('click', () => {
  $('delete-confirm').hidden = false;
});
$('confirm-clear').addEventListener('click', async () => {
  const response = await api.runtime.sendMessage({ type: 'clear-history' });
  if (response.error) {
    $('feedback').textContent = response.error;
    return;
  }
  $('delete-confirm').hidden = true;
  await refresh();
});
api.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.session || changes.history)) void refresh();
});
await refresh();
