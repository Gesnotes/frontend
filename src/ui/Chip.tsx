import type { ReactNode } from 'react';
import type { ChipTone } from './tone';

export function Chip({ tone = 'neutral', children }: { tone?: ChipTone; children: ReactNode }) {
  return <span className={`ui-chip ui-chip--${tone}`}>{children}</span>;
}
