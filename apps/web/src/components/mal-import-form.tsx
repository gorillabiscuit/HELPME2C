'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type ChangeEvent } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Browser-side MAL XML parser. MAL exports look like:
//
//   <?xml version="1.0" encoding="UTF-8"?>
//   <myanimelist>
//     <myinfo>...</myinfo>
//     <anime>
//       <series_animedb_id>21</series_animedb_id>
//       <my_status>Watching</my_status>
//       <my_score>8</my_score>
//       <my_watched_episodes>500</my_watched_episodes>
//       ...
//     </anime>
//     ...
//   </myanimelist>
//
// We use the browser DOMParser (no dep needed) to extract the per-anime
// fields we care about, normalise to our shape, and POST the parsed
// entries to listImport.fromMal. Doing it client-side avoids a server
// XML parser dependency and works for files of any size the user can
// upload (browser memory budget) without server bandwidth.

type ParsedStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

const MAL_STATUS_MAP: Record<string, ParsedStatus> = {
  Watching: 'watching',
  Completed: 'completed',
  'On-Hold': 'on_hold',
  Dropped: 'dropped',
  'Plan to Watch': 'plan_to_watch',
};

interface ParsedEntry {
  malId: number;
  status: ParsedStatus;
  rating: number | null;
  currentEpisode: number | null;
}

function parseMalXml(text: string): { entries: ParsedEntry[]; warnings: string[] } {
  const warnings: string[] = [];
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const parserError = doc.querySelector('parsererror');
  if (parserError) {
    throw new Error('Could not parse XML — is this a valid MAL export?');
  }

  const animeNodes = Array.from(doc.querySelectorAll('myanimelist > anime'));
  const entries: ParsedEntry[] = [];
  for (const node of animeNodes) {
    const idText = node.querySelector('series_animedb_id')?.textContent?.trim();
    const malId = idText ? Number.parseInt(idText, 10) : NaN;
    if (!Number.isFinite(malId) || malId <= 0) continue;

    const statusText = node.querySelector('my_status')?.textContent?.trim() ?? '';
    const status = MAL_STATUS_MAP[statusText];
    if (!status) {
      warnings.push(`Skipping anime ${malId}: unknown status "${statusText}"`);
      continue;
    }

    const scoreText = node.querySelector('my_score')?.textContent?.trim() ?? '0';
    const scoreNum = Number.parseInt(scoreText, 10);
    const rating = Number.isFinite(scoreNum) && scoreNum >= 1 && scoreNum <= 10 ? scoreNum : null;

    const epText = node.querySelector('my_watched_episodes')?.textContent?.trim() ?? '0';
    const epNum = Number.parseInt(epText, 10);
    const currentEpisode = Number.isFinite(epNum) && epNum > 0 ? epNum : null;

    entries.push({ malId, status, rating, currentEpisode });
  }
  return { entries, warnings };
}

export function MalImportForm() {
  const router = useRouter();
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedEntry[] | null>(null);
  const [, startTransition] = useTransition();

  const importMutation = trpc.listImport.fromMal.useMutation({
    onSuccess: () => {
      startTransition(() => router.refresh());
    },
  });

  const onFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setParsed(null);
      setParseStatus(null);
      return;
    }
    try {
      const text = await file.text();
      const result = parseMalXml(text);
      setParsed(result.entries);
      const warnNote = result.warnings.length > 0 ? ` (${result.warnings.length} skipped)` : '';
      setParseStatus(`Parsed ${result.entries.length} entries${warnNote}.`);
    } catch (err) {
      setParsed(null);
      setParseStatus(err instanceof Error ? err.message : 'Parse failed');
    }
  };

  const onSubmit = () => {
    if (!parsed || parsed.length === 0) return;
    importMutation.mutate({ entries: parsed });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="mal-file">MAL XML export file</Label>
        <input
          id="mal-file"
          type="file"
          accept=".xml,application/xml,text/xml"
          onChange={onFileChange}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-slate-800"
        />
        <p className="text-xs text-slate-500">
          Get your export at{' '}
          <a
            href="https://myanimelist.net/panel.php?go=export"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-700 underline"
          >
            myanimelist.net/panel.php?go=export
          </a>{' '}
          (download + unzip the .xml file).
        </p>
      </div>

      {parseStatus ? <p className="text-sm text-slate-600">{parseStatus}</p> : null}

      <Button
        type="button"
        onClick={onSubmit}
        disabled={!parsed || parsed.length === 0 || importMutation.isPending}
      >
        {importMutation.isPending ? 'Importing…' : 'Import from MAL'}
      </Button>

      {importMutation.isSuccess ? (
        <p className="text-sm text-emerald-700">
          Imported {importMutation.data.imported} of {importMutation.data.total} titles.
          {importMutation.data.skipped > 0
            ? ` Skipped ${importMutation.data.skipped} not in our catalogue.`
            : ''}
        </p>
      ) : null}
      {importMutation.isError ? (
        <p className="text-sm text-red-700">{importMutation.error.message}</p>
      ) : null}
    </div>
  );
}
