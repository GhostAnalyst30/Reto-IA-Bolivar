import Link from 'next/link';
import { Card } from '@/components/ui';
import {
  ClipboardList,
  Users,
  Compass,
  FolderOpen,
  HeartHandshake,
  GraduationCap,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Usuarios',
    items: [
      { href: '/institutional/admin/users/students', label: 'Estudiantes', icon: Users, desc: 'Listado y gestión de estudiantes' },
      { href: '/institutional/admin/users/directivos', label: 'Staff', icon: Users, desc: 'Administradores y psicólogos' },
      { href: '/institutional/admin/users/create', label: 'Crear usuario', icon: Users, desc: 'Alta inmediata aprobada' },
    ],
  },
  {
    title: 'Contenido',
    items: [
      { href: '/institutional/admin/content', label: 'Oportunidades', icon: Compass, desc: 'Becas, convocatorias y eventos' },
      { href: '/institutional/admin/resources', label: 'Recursos', icon: FolderOpen, desc: 'Videos y enlaces de apoyo' },
    ],
  },
  {
    title: 'Solicitudes y apoyo',
    items: [
      { href: '/institutional/admin/requests', label: 'Solicitudes de registro', icon: ClipboardList, desc: 'Vincular o denegar cuentas' },
      { href: '/institutional/admin/support-requests', label: 'Apoyo humano', icon: HeartHandshake, desc: 'Solicitudes de acompañamiento' },
    ],
  },
  {
    title: 'Académico',
    items: [
      { href: '/institutional/admin/academic-outcomes', label: 'Estados académicos', icon: GraduationCap, desc: 'Retención y retiros' },
    ],
  },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Administración</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Módulos de gestión institucional. Claves de rol y seguridad solo están en el panel de plataforma.
        </p>
      </div>
      {GROUPS.map((group) => (
        <section key={group.title} className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-brand-amber">{group.title}</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((l) => (
              <Link key={l.href} href={l.href}>
                <Card className="hover:border-brand-amber/40 transition-colors h-full">
                  <l.icon className="h-8 w-8 text-brand-amber mb-3" />
                  <h3 className="font-semibold">{l.label}</h3>
                  <p className="text-sm text-zinc-500 mt-1">{l.desc}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
