/**
 * /sources — transparency manifest.
 *
 * Server Component. Fetches /api/v1/sources on the server and renders
 * the table + pledge in <SourcesView/>. Per CLAUDE.md "never" rule #2:
 * no client-side fetch for initial render.
 */

import type { Metadata } from 'next';

import { SourcesView } from '@/components/sources/SourcesView';
import { getSources, type SourcesResponse } from '@/lib/api-client';


export const metadata: Metadata = {
  title:       'Sources — LeaseWise Canada',
  description: 'Where every LeaseWise number comes from. Confidence ratings + last-sync timestamps for each data source.',
};


// No caching — manifests are small and we want updated last-sync display.
export const dynamic = 'force-dynamic';


export default async function SourcesPage(): Promise<JSX.Element> {
  let data: SourcesResponse | null = null;
  try {
    data = await getSources();
  } catch {
    // Backend unreachable — render the "we couldn't load" hero variant.
    data = null;
  }
  return <SourcesView data={data} />;
}
