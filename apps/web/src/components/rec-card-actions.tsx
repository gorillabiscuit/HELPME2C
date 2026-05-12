import { TitleQuickActions } from '@/components/title-quick-actions';

interface RecCardActionsProps {
  titleId: string;
}

// Thin wrapper around the shared TitleQuickActions panel. Rec cards
// only ever show titles the user has no prior watch_entry for (the
// rec query excludes library + dismissed), so currentState is always
// null here — but the same component handles state-aware contexts
// (Add tab, onboarding picker).
export function RecCardActions({ titleId }: RecCardActionsProps) {
  return <TitleQuickActions titleId={titleId} currentState={null} />;
}
