/* oxlint-disable jsx-a11y/prefer-tag-over-role -- The CSS bar chart exposes one accessible image description rather than a bitmap. */
'use client';
import { useState } from 'react';
import { summarize, report, startSession } from '../core/engine.mjs';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
type Session = ReturnType<typeof startSession>;
export default function Dashboard({
  history,
  onExport,
}: {
  history: Session[];
  onExport: () => void;
}) {
  const [days, setDays] = useState(7);
  const data = summarize(history, days);
  const max = Math.max(1, ...data.daily.map((d) => d.minutes));
  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR PROGRESS</p>
          <h1>Time well spent.</h1>
        </div>
        <button className="quiet-button" onClick={onExport}>
          Export data
        </button>
      </div>
      <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
        <TabsList className="period-tabs">
          {[
            [7, 'Week'],
            [30, 'Month'],
            [0, 'All time'],
          ].map(([v, label]) => (
            <TabsTrigger value={String(v)} key={v}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <div className="metric-grid">
        <div>
          <span>Time in session</span>
          <strong>
            {Math.floor(data.seconds / 3600)}
            <small>h </small>
            {Math.floor((data.seconds % 3600) / 60)}
            <small>m</small>
          </strong>
        </div>
        <div>
          <span>Sessions finished</span>
          <strong>
            {data.completed}
            <small> / {data.sessions}</small>
          </strong>
        </div>
        <div>
          <span>Distractions stopped</span>
          <strong>{data.attempts}</strong>
        </div>
        <div>
          <span>Completion</span>
          <strong>
            {data.completionRate === null ? '—' : `${data.completionRate}%`}
          </strong>
        </div>
      </div>
      <section className="chart-card">
        <div className="card-heading">
          <h2>Your daily rhythm</h2>
          <span>{days === 0 ? 'Last 30 days' : 'Minutes per day'}</span>
        </div>
        <div
          className="daily-chart"
          role="img"
          aria-label={data.daily
            .map((d) => `${d.label}: ${d.minutes} minutes`)
            .join('; ')}
        >
          {data.daily.map((d) => (
            <div
              className="day-column"
              key={d.date}
              title={`${d.label}: ${d.minutes} minutes`}
            >
              <div className="bar-track">
                <div
                  className="day-bar"
                  style={{ height: `${(d.minutes / max) * 100}%` }}
                />
              </div>
              {data.daily.length === 7 && (
                <span>
                  {new Date(d.date).toLocaleDateString(undefined, {
                    weekday: 'narrow',
                  })}
                </span>
              )}
            </div>
          ))}
        </div>
        {!data.sessions && (
          <p className="empty-caption">
            Finish a session to see your daily minutes here.
          </p>
        )}
      </section>
      <div className="dashboard-columns">
        <section className="chart-card">
          <h2>What pulled your attention</h2>
          {data.domains.length ? (
            data.domains.slice(0, 8).map(([domain, count]) => (
              <div className="domain-stat" key={String(domain)}>
                <span>{domain}</span>
                <strong>{count}</strong>
              </div>
            ))
          ) : (
            <p className="muted">No distractions recorded in this period.</p>
          )}
          <p className="small muted">
            {data.escaped} exits · {data.recovered} recoveries
          </p>
        </section>
        <section className="chart-card">
          <h2>Recent sessions</h2>
          {data.rows.length ? (
            data.rows.slice(0, 20).map((s: Session) => {
              const r = report(s);
              return (
                <details className="history-item" key={s.id}>
                  <summary>
                    <div>
                      <strong>{s.task}</strong>
                      <span>
                        {new Date(s.startedAt).toLocaleDateString()} ·{' '}
                        {s.status}
                      </span>
                    </div>
                    <span>{Math.floor(r.seconds / 60)}m</span>
                  </summary>
                  <p>
                    {r.attempts} attempts stopped · {r.accessRequests} access
                    requests
                  </p>
                  {Object.entries(r.domains).map(([d, n]) => (
                    <div className="domain-stat" key={d}>
                      <span>{d}</span>
                      <strong>{String(n)}</strong>
                    </div>
                  ))}
                </details>
              );
            })
          ) : (
            <p className="muted">Completed sessions will appear here.</p>
          )}
        </section>
      </div>
      <p className="dashboard-note">
        Time describes your recorded sessions, including early exits. It is not
        a measure of work quality.
      </p>
    </section>
  );
}
