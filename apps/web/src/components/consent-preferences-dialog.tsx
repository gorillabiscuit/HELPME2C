'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useConsent } from '@/components/consent-provider';

export function ConsentPreferencesDialog() {
  const { consent, preferencesOpen, setPreferencesOpen, setConsent } = useConsent();
  const [analytics, setAnalytics] = useState(consent?.categories.analytics ?? false);
  const [sessionReplay, setSessionReplay] = useState(consent?.categories.sessionReplay ?? false);

  // Re-sync the local toggle state with stored consent each time the dialog opens.
  useEffect(() => {
    if (preferencesOpen) {
      setAnalytics(consent?.categories.analytics ?? false);
      setSessionReplay(consent?.categories.sessionReplay ?? false);
    }
  }, [preferencesOpen, consent]);

  function handleSave() {
    setConsent({ analytics, sessionReplay });
  }

  return (
    <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cookie preferences</DialogTitle>
          <DialogDescription>
            Choose which categories of cookies and tracking you allow. Strictly necessary cookies
            are always on — they keep the site working.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="essential" className="font-medium">
                Strictly necessary
              </Label>
              <p className="text-sm text-slate-500">Auth, security, and session. Always on.</p>
            </div>
            <Switch id="essential" checked disabled />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="analytics" className="font-medium">
                Product analytics
              </Label>
              <p className="text-sm text-slate-500">
                Page views and event tracking so we can understand how the product is used.
              </p>
            </div>
            <Switch id="analytics" checked={analytics} onCheckedChange={setAnalytics} />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor="session-replay" className="font-medium">
                Session replay
              </Label>
              <p className="text-sm text-slate-500">
                Recordings of UI interactions (input fields are masked). More invasive than plain
                analytics; held as a separate toggle.
              </p>
            </div>
            <Switch
              id="session-replay"
              checked={sessionReplay}
              onCheckedChange={setSessionReplay}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setPreferencesOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save preferences</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
