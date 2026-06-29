import Link from 'next/link';
import { Card } from '@/components/ui';
import { Key, Shield, ClipboardList } from 'lucide-react';

const LINKS = [
  { href: '/institutional/admin/requests', label: 'Solicitudes de registro', icon: ClipboardList, desc: 'Aprobar o denegar usuarios' },
  { href: '/institutional/admin/auth-keys', label: 'Claves de rol', icon: Key, desc: 'Generar auth_keys para directivos' },
  { href: '/institutional/admin/security', label: 'Panel de seguridad', icon: Shield, desc: 'Alertas y sesiones activas' },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Administración</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="hover:border-brand-amber/40 transition-colors h-full">
              <l.icon className="h-8 w-8 text-brand-amber mb-3" />
              <h3 className="font-semibold">{l.label}</h3>
              <p className="text-sm text-zinc-500 mt-1">{l.desc}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
