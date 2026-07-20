'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActiveNavIndicator } from '@/components/portal/ActiveNavIndicator';
import type { NavEntry, NavGroup, NavItem } from '@/lib/nav-types';
import { isGroupActive, isNavActive, isNavGroup } from '@/lib/nav-types';
import { useState } from 'react';

interface NavMenuProps {
  entries: NavEntry[];
  pathname: string;
  onNavigate?: () => void;
  accentClass?: string;
}

function NavLink({
  item,
  pathname,
  onNavigate,
  nested,
}: {
  item: NavItem;
  pathname: string;
  onNavigate?: () => void;
  nested?: boolean;
}) {
  const active = isNavActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'relative block rounded-[var(--portal-radius,0.25rem)] px-3 py-2 text-sm transition-colors',
        nested && 'text-[13px]',
        active
          ? 'bg-[color-mix(in_srgb,var(--portal-accent)_12%,transparent)] font-medium text-[var(--portal-accent)]'
          : 'text-muted hover:bg-brand-bg hover:text-foreground dark:hover:text-white'
      )}
    >
      <ActiveNavIndicator active={active} />
      <span className="relative">{item.label}</span>
    </Link>
  );
}

function NavGroupSection({
  group,
  pathname,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
}) {
  const groupActive = isGroupActive(pathname, group);
  const [open, setOpen] = useState(groupActive);

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex w-full items-center justify-between rounded-[var(--portal-radius,0.25rem)] px-3 py-2 text-sm transition-colors',
          groupActive
            ? 'font-medium text-[var(--portal-accent)]'
            : 'text-muted hover:text-[var(--portal-accent)]'
        )}
      >
        <span>{group.label}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="ml-2 mt-1 space-y-1 border-l border-brand-border pl-2">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} nested />
          ))}
        </div>
      )}
    </div>
  );
}

export function NavMenu({ entries, pathname, onNavigate }: NavMenuProps) {
  return (
    <>
      {entries.map((entry) =>
        isNavGroup(entry) ? (
          <NavGroupSection key={entry.label} group={entry} pathname={pathname} onNavigate={onNavigate} />
        ) : (
          <NavLink key={entry.href} item={entry} pathname={pathname} onNavigate={onNavigate} />
        )
      )}
    </>
  );
}

export function filterNavEntries(
  entries: NavEntry[],
  isAdmin: boolean,
  isCounselor = false,
): NavEntry[] {
  const visible = (e: { adminOnly?: boolean; counselorOnly?: boolean }) => {
    if (e.counselorOnly) return isCounselor;
    if (e.adminOnly) return isAdmin;
    return true;
  };
  return entries
    .filter((e) => visible(e))
    .map((e) => {
      if (isNavGroup(e)) {
        const items = e.items.filter((i) => visible(i));
        if (items.length === 0) return null;
        return { ...e, items };
      }
      return e;
    })
    .filter((e): e is NavEntry => e !== null);
}
