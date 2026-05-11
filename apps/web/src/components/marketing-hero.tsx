import { SignUpButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';

export function MarketingHero() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="text-5xl font-semibold tracking-tight">HelpME2C</h1>
      <p className="mt-3 text-xl text-text-body">
        Cross-medium recommendations for couples and households.
      </p>
      <ul className="mt-10 space-y-3 text-base text-foreground">
        <li>
          <span className="font-medium">Theme-based, not genre-based</span> — match how you actually
          watch, not just what category a show fits.
        </li>
        <li>
          <span className="font-medium">Group recommendations</span> — discover what you and your
          partner will both love.
        </li>
        <li>
          <span className="font-medium">Cross-medium bridging</span> — anime fans finding TV
          they&apos;ll love, and vice versa.
        </li>
      </ul>
      <div className="mt-10">
        <SignUpButton mode="modal">
          <Button size="lg">Get started</Button>
        </SignUpButton>
      </div>
    </section>
  );
}
