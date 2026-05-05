/**
 * Homepage — / .
 *
 * Phase 1.2 placeholder. The full homepage (hero, deal ticker, programs
 * snapshot, community highlights, sources strip) lands in a later phase
 * and will replace this. For now, this just exists so visiting /
 * doesn't 500 and so it points at the calculator.
 */

import Link from 'next/link';


export default function HomePage(): JSX.Element {
  return (
    <main>
      <section style={{ padding: 'var(--space-16) 0' }}>
        <div className="container">
          <span className="eyebrow">LeaseWise Canada</span>
          <h1 className="t-h1" style={{ marginTop: 12 }}>
            Real lease data for Canadian car buyers.
          </h1>
          <p className="t-body-l" style={{ maxWidth: '60ch', marginTop: 16 }}>
            Tools, brand guides, and a community forum — all built around
            real Canadian lease programs and real provincial tax math.
            Phase 1 is in development.
          </p>
          <p style={{ marginTop: 24 }}>
            <Link href="/tools/calculator" style={{ textDecoration: 'underline' }}>
              Open the lease calculator →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
