'use client';

import { Button, Card, DataTable, Input } from '@julio/ui';

export function EngineIntelligencePanel({
  contentItems,
  sourceMedia,
  clips,
  socialScores,
  trends,
  trendMatches,
  actionKey,
  runAction,
  scrapeForm,
  setScrapeForm,
  trendForm,
  setTrendForm
}) {
  const contentColumns = [
    { accessorKey: 'platform', header: 'Platform' },
    { accessorKey: 'sourceAuthor', header: 'Author' },
    { accessorKey: 'status', header: 'Status' },
    { accessorKey: 'score', header: 'Score' },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="layout-inline-gap-8">
          <Button size="sm" variant="secondary" loading={actionKey === `content:${row.original._id}:download`} onClick={() => runAction(`content:${row.original._id}:download`, () => row.original.download())}>
            download
          </Button>
          <Button size="sm" variant="secondary" onClick={() => runAction(`content:${row.original._id}:reject`, () => row.original.reject())}>
            reject
          </Button>
        </div>
      )
    }
  ];

  const sourceColumns = [
    { accessorKey: 'originalUrl', header: 'Source URL' },
    { accessorKey: 'durationSeconds', header: 'Duration' },
    { accessorKey: 'metadata.title', header: 'Title' }
  ];
  const clipColumns = [
    { accessorKey: 'title', header: 'Clip' },
    { accessorKey: 'viralScore', header: 'Score' },
    { accessorKey: 'publicUrl', header: 'Public URL' }
  ];
  const scoreColumns = [
    { accessorKey: 'targetType', header: 'Target' },
    { accessorKey: 'score', header: 'Score' },
    { accessorKey: 'rationale', header: 'Rationale' }
  ];
  const trendColumns = [
    { accessorKey: 'platform', header: 'Platform' },
    { accessorKey: 'title', header: 'Trend' },
    { accessorKey: 'nicheKey', header: 'Niche' },
    { accessorKey: 'outlierRatio', header: 'Relevance' }
  ];
  const matchColumns = [
    { accessorKey: 'trendId', header: 'Trend ID' },
    { accessorKey: 'contentChunkId', header: 'Chunk ID' },
    { accessorKey: 'score', header: 'Score' },
    { accessorKey: 'rationale', header: 'Rationale' }
  ];

  async function submitScrape(event) {
    event.preventDefault();
    await runAction('social:scrape', () => scrapeForm.submit());
  }

  async function submitTrend(event) {
    event.preventDefault();
    await runAction('trend:upsert', () => trendForm.submit());
  }

  return (
    <div className="layout-stack-gap-12">
      <Card>
        <div className="layout-stack-gap-12">
          <h2>Content Pool</h2>
          <DataTable columns={contentColumns} data={contentItems} emptyMessage="No discovered content yet." />
        </div>
      </Card>
      <Card>
        <div className="layout-stack-gap-12">
          <h2>Pipeline Outputs</h2>
          <DataTable columns={sourceColumns} data={sourceMedia} emptyMessage="No source media yet." />
          <DataTable columns={clipColumns} data={clips} emptyMessage="No clips cut yet." />
        </div>
      </Card>
      <Card>
        <div className="layout-stack-gap-12">
          <h2>Social Scrape</h2>
          <form className="HomeFeatureGrid" onSubmit={submitScrape}>
            <Input placeholder="platform" value={scrapeForm.platform} onChange={(event) => setScrapeForm((prev) => ({ ...prev, platform: event.target.value }))} />
            <Input placeholder="handle" value={scrapeForm.handle} onChange={(event) => setScrapeForm((prev) => ({ ...prev, handle: event.target.value }))} />
            <Input placeholder="url" value={scrapeForm.url} onChange={(event) => setScrapeForm((prev) => ({ ...prev, url: event.target.value }))} />
            <Button type="submit" loading={actionKey === 'social:scrape'}>Scrape</Button>
          </form>
          <DataTable columns={scoreColumns} data={socialScores} emptyMessage="No social scores yet." />
        </div>
      </Card>
      <Card>
        <div className="layout-stack-gap-12">
          <h2>Trends</h2>
          <form className="HomeFeatureGrid" onSubmit={submitTrend}>
            <Input placeholder="title" value={trendForm.title} onChange={(event) => setTrendForm((prev) => ({ ...prev, title: event.target.value }))} />
            <Input placeholder="description" value={trendForm.description} onChange={(event) => setTrendForm((prev) => ({ ...prev, description: event.target.value }))} />
            <Input placeholder="nicheKey" value={trendForm.nicheKey} onChange={(event) => setTrendForm((prev) => ({ ...prev, nicheKey: event.target.value }))} />
            <Button type="submit" loading={actionKey === 'trend:upsert'}>Upsert trend</Button>
          </form>
          <div className="layout-inline-gap-8">
            <Button size="sm" variant="secondary" onClick={() => runAction('trend:match', () => trendForm.match())}>Run match</Button>
            <Button size="sm" variant="secondary" onClick={() => runAction('trend:feedback', () => trendForm.feedback())}>Run feedback</Button>
          </div>
          <DataTable columns={trendColumns} data={trends} emptyMessage="No trends yet." />
          <DataTable columns={matchColumns} data={trendMatches} emptyMessage="No trend matches yet." />
        </div>
      </Card>
    </div>
  );
}
