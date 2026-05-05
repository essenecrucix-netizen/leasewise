/**
 * /tools/calculator — Canadian lease calculator.
 *
 * Server Component shell. The interactive part lives in <Calculator/>
 * (a Client Component) because it owns form state, debounced input, and
 * the backend fetch. Per CLAUDE.md: Server Components are the default,
 * 'use client' only when needed.
 */

import type { Metadata } from 'next';

import { Calculator } from '@/components/calculator/Calculator';
import calcStyles from '@/components/calculator/calculator.module.css';


export const metadata: Metadata = {
  title:       'Lease calculator — LeaseWise Canada',
  description: 'Canadian lease calculator with provincial tax math handled correctly.',
};


export default function CalculatorPage(): JSX.Element {
  return (
    <main>
      <section className={calcStyles.page}>
        <div className="container">
          <div className={calcStyles.head}>
            <div>
              <span className="eyebrow">Tool · /tools/calculator</span>
              <h1 className="t-h1">Canadian lease calculator.</h1>
              <p className="t-body-l">
                Provincial tax math handled correctly. Your inputs stay in
                your browser — no account required, ever.
              </p>
            </div>
          </div>
          <Calculator />
        </div>
      </section>
    </main>
  );
}
