/**
 * Homepage — /
 *
 * Server Component. Fetches recent deals + active programs from the FastAPI
 * backend and renders the homepage hero, ticker, and "what dealers know"
 * panel. The composition mirrors the design-phase output at
 * docs/design-phase/homepage.jsx.
 *
 * Mobile responsive: at <768px, layout collapses to single column.
 */

import { Suspense } from 'react';

import { HomepageHero }       from '@/components/homepage/HomepageHero';
import { DealTicker }         from '@/components/homepage/DealTicker';
import { WhatDealersKnow }    from '@/components/homepage/WhatDealersKnow';
import { FloorplanClock }     from '@/components/homepage/FloorplanClock';
import { ProgramsSnapshot }   from '@/components/homepage/ProgramsSnapshot';
import { CommunityHighlights } from '@/components/homepage/CommunityHighlights';
import { SourcesStrip }       from '@/components/homepage/SourcesStrip';

import { fetchRecentDeals }   from '@/lib/api/deals';
import { fetchActivePrograms } from '@/lib/api/programs';


export const metadata = {
  title:       'LeaseWise Canada — Real lease data for Canadian car buyers',
  description: 'Free Canadian lease calculator with real provincial tax math. Real deal data from real Canadians. No accounts, no upsells.',
};


export default async function HomePage() {
  // Parallel fetch on the server. Errors fall back gracefully to empty states.
  const [deals, programs] = await Promise.all([
    fetchRecentDeals({ limit: 12 }).catch(() => []),
    fetchActivePrograms({ topN: 5 }).catch(() => []),
  ]);

  return (
    <main>
      <HomepageHero />

      <Suspense fallback={<DealTickerSkeleton />}>
        <DealTicker deals={deals} />
      </Suspense>

      <WhatDealersKnow />

      <FloorplanClock vin="WBA5R7C58RFL12345" />

      <ProgramsSnapshot programs={programs} />

      <CommunityHighlights />

      <SourcesStrip />
    </main>
  );
}


function DealTickerSkeleton() {
  return (
    <div className="ticker-skeleton" aria-busy="true">
      <span className="lwm-eyebrow">LIVE FROM THE FORUM</span>
    </div>
  );
}
