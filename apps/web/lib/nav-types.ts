export interface NavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
  counselorOnly?: boolean;
}

export interface NavGroup {
  label: string;
  adminOnly?: boolean;
  counselorOnly?: boolean;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return 'items' in entry && Array.isArray((entry as NavGroup).items);
}

export function flattenNav(entries: readonly NavEntry[]): NavItem[] {
  const out: NavItem[] = [];
  for (const e of entries) {
    if (isNavGroup(e)) out.push(...e.items);
    else out.push(e);
  }
  return out;
}

export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export function isGroupActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((item) => isNavActive(pathname, item.href));
}
