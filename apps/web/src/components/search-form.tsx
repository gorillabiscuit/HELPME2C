'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchFormProps {
  defaultQuery?: string | undefined;
  /** The hidden `type` param to preserve the active filter pill. */
  mediaType?: string | undefined;
}

// Client wrapper around the /search form. Using useTransition + router.push
// lets React track the navigation as a concurrent transition — isPending is
// true from submission until the new server component tree has rendered and
// committed, so the spinner is automatically scoped to the real fetch duration.
export function SearchForm({ defaultQuery, mediaType }: SearchFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const q = (data.get('q') as string | null)?.trim() ?? '';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (mediaType) params.set('type', mediaType);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/search?${qs}` : '/search');
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 flex gap-2">
      <label htmlFor="search-q" className="sr-only">
        Search the catalogue
      </label>
      <div className="relative max-w-md flex-1">
        <Input
          id="search-q"
          name="q"
          type="search"
          defaultValue={defaultQuery ?? ''}
          placeholder="Game of Thrones, Squid Game…"
          autoFocus
          className={cn('w-full', isPending && 'pr-9')}
          disabled={isPending}
        />
        {isPending ? (
          <Loader2
            className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : null}
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Searching…' : 'Search'}
      </Button>
    </form>
  );
}
