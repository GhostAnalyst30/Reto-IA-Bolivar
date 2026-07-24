'use client';

import { useEffect, useRef } from 'react';

/**
 * Wraps children with a scroll-triggered slide-up reveal.
 * Also animates any `.progress-fill` children from 0 to their data-width.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            const bars = entry.target.querySelectorAll<HTMLElement>('.progress-fill');
            bars.forEach((bar) => {
              const target = bar.dataset.width || '0%';
              bar.style.width = '0px';
              window.setTimeout(() => {
                bar.style.width = target;
              }, 150);
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal-on-scroll ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
