import type { ReactNode } from 'react';

export interface MonoProps {
  children: ReactNode;
}

export function Mono({ children }: MonoProps) {
  return <span className="font-mono">{children}</span>;
}
