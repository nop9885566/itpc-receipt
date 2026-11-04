'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppIcon from './AppIcon';

const links = [
  { href: '/receipts', label: 'ใบเสร็จ', icon: 'receipt' as const },
  { href: '/receipts/new', label: 'ออกใบเสร็จ', icon: 'plus' as const },
  { href: '/inventory', label: 'สต็อกสินค้า', icon: 'box' as const },
];

export default function MainNavLinks() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="เมนูหลัก">
      {links.map((link) => {
        const active = link.href === '/receipts'
          ? pathname === '/receipts' || (pathname.startsWith('/receipts/') && pathname !== '/receipts/new')
          : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={active ? 'active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <AppIcon name={link.icon} size={18} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
