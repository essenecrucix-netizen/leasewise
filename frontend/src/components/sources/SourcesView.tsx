/**
 * Sources view — pure presentation.
 *
 * Server-Component-rendered. The page (app/sources/page.tsx) fetches
 * /api/v1/sources on the server and passes the result to this view.
 * No client-side state, no `'use client'`.
 */

import type { Source, SourceConfidence, SourcesResponse } from '@/lib/api-client';

import styles from './sources.module.css';


export function SourcesView({ data }: { data: SourcesResponse | null }): JSX.Element {
  if (data === null) {
    return (
      <main>
        <section className={styles.hero}>
          <div className="container">
            <span className="eyebrow">Transparency</span>
            <h1 className={styles.heroTitle}>We show our sources.</h1>
            <p className={styles.heroSub}>
              We&rsquo;re unable to load the sources manifest right now — the
              backend may be down or unreachable. Try again in a moment.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const sources = data.sources;
  const summary = data.summary;
  const lastSyncDisplay = mostRecentLastSync(sources);

  return (
    <main>
      <section className={styles.hero}>
        <div className="container">
          <span className="eyebrow">Transparency · Phase 1</span>
          <h1 className={styles.heroTitle}>We show our sources.</h1>
          <p className={styles.heroSub}>
            Every number on LeaseWise is traceable. Click a payment, see which
            captive program produced it. Click a percentile, see the comparable
            leases. (Phase 1.3 ships the manifest; live ingestion turns on
            in 1.4.)
          </p>
        </div>
      </section>

      <section className={styles.livestrip}>
        <div className="container">
          <div className={styles.livestripInner}>
            <div className={styles.livestat}>
              <span className={styles.livestatLabel}>Most recent sync</span>
              <span className={`${styles.livestatValue} ${lastSyncDisplay ? styles.livestatLime : ''}`}>
                {lastSyncDisplay ? `● ${lastSyncDisplay}` : 'pending — Phase 1.4'}
              </span>
            </div>
            <div className={styles.livestat}>
              <span className={styles.livestatLabel}>Datapoints</span>
              <span className={styles.livestatValue}>{summary['datapoints_label'] ?? '—'}</span>
            </div>
            <div className={styles.livestat}>
              <span className={styles.livestatLabel}>Coverage</span>
              <span className={styles.livestatValue}>{summary['coverage_label'] ?? '—'}</span>
            </div>
            <div className={styles.livestat}>
              <span className={styles.livestatLabel}>Independence</span>
              <span className={styles.livestatValue}>{summary['independence_label'] ?? 'No paid placement'}</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.tableSection}>
        <div className="container">
          <div className={styles.tableSectionHead}>
            <span className="eyebrow">All sources · n={sources.length}</span>
            <span className="t-body-s c-muted">Phase 1.3 — pre-ingestion manifest</span>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Source</th>
                <th style={{ width: '28%' }}>Coverage</th>
                <th style={{ width: '30%' }}>Method</th>
                <th style={{ width: '10%' }}>Updated</th>
                <th style={{ width: '10%' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.name}>
                  <td className={styles.sourceName}>{s.name}</td>
                  <td><span className={styles.meta}>{s.coverage}</span></td>
                  <td><span className={styles.method}>{s.method}</span></td>
                  <td>
                    {s.last_sync_human
                      ? <span className={styles.lastSync}>{s.last_sync_human}</span>
                      : <span className={`${styles.lastSync} ${styles.pendingDot}`}>pending</span>}
                  </td>
                  <td>
                    <ConfidenceBadge value={s.confidence} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.pledge}>
        <div className="container">
          <div className={styles.pledgeCard}>
            <span className={`eyebrow ${styles.pledgeEyebrow}`}>Independence pledge</span>
            <p className={styles.pledgeBody}>
              LeaseWise does not take advertising from any manufacturer, dealer
              group, or lender whose programs appear on this site. We do not
              sell leads. We do not run paid placement. Sponsored listings are{' '}
              <strong>prohibited</strong> by our charter and disclosed inline
              if that ever changes.
            </p>
            <div className={styles.pledgeRow}>
              <div>
                <div className={styles.pledgeStat}>$0</div>
                <div className={styles.pledgeStatLabel}>Manufacturer ad revenue</div>
              </div>
              <div>
                <div className={styles.pledgeStat}>100%</div>
                <div className={styles.pledgeStatLabel}>Subscription &amp; community revenue</div>
              </div>
              <div>
                <div className={styles.pledgeStat}>0</div>
                <div className={styles.pledgeStatLabel}>Dealer leads sold or referred</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}


function ConfidenceBadge({ value }: { value: SourceConfidence }): JSX.Element {
  const cls =
    value === 'high'   ? styles.badgeHigh :
    value === 'medium' ? styles.badgeMedium :
                         styles.badgeLow;
  return <span className={`${styles.badge} ${cls}`}>{value}</span>;
}


function mostRecentLastSync(sources: Source[]): string | null {
  // Find the source with the most recent non-null last_sync.
  const synced = sources
    .filter((s) => s.last_sync !== null)
    .sort((a, b) => (a.last_sync! < b.last_sync! ? 1 : -1));
  return synced[0]?.last_sync_human ?? null;
}
