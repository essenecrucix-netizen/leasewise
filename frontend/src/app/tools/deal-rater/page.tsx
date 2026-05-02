/**
 * /tools/deal-rater — Canadian dealer-worksheet grader.
 *
 * Server Component shell. The interactive part lives in <Rater/>
 * (a Client Component) because it owns input mode, form state, and the
 * backend fetch. CLAUDE.md: Server Components default; 'use client'
 * only when needed.
 */

import type { Metadata } from 'next';

import { Rater } from '@/components/rater/Rater';
import styles from '@/components/rater/rater.module.css';


export const metadata: Metadata = {
  title:       'Deal rater — LeaseWise Canada',
  description: 'Paste a Canadian dealer worksheet and get a graded readout — captive markup, residual fit, discount, F&I add-ons.',
};


export default function DealRaterPage(): JSX.Element {
  return (
    <main>
      <section className={styles.page}>
        <div className="container">
          <div className={styles.head}>
            <span className="eyebrow">Tool · /tools/deal-rater</span>
            <h1 className="t-h1">Rate your dealer worksheet.</h1>
            <p className="t-body-l">
              Paste the document, drop a PDF, or type the numbers. We score it
              against the captive lender base rate and (when available)
              anonymized community deals.
            </p>
          </div>
          <Rater />
        </div>
      </section>
    </main>
  );
}
