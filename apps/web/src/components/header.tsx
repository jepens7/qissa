import type { ReactNode } from 'react';

type Props = { name: string; initial: string; status: string; right?: ReactNode };

/** Header chat aktif, sticky di bawah safe area (DESIGN-SYSTEM §4). */
export function Header({ name, initial, status, right }: Props) {
  return (
    <header className="top">
      <div className="top-in">
        <div className="avatar" aria-hidden="true">
          {initial}
        </div>
        <div className="who">
          <div className="name">{name}</div>
          <div className="status">{status}</div>
        </div>
        {right}
      </div>
    </header>
  );
}
