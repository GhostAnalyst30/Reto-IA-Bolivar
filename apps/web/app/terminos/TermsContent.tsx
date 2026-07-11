'use client';

import { TERMS_SECTIONS } from '@/components/immersive/data/terms-content';
import { ClayCard } from '@/components/immersive/clay/ClayCard';
import { ContentSection, ContentSectionItem } from '@/components/immersive/primitives/ContentSection';
import { cn } from '@/lib/utils';

export function TermsContent() {
  return (
    <ContentSection gridClassName="grid gap-6 sm:grid-cols-2">
      {TERMS_SECTIONS.map((section) => (
        <ContentSectionItem
          key={section.id}
          className={cn(section.colSpan === 2 && 'sm:col-span-2')}
        >
          <ClayCard className="h-full" id={section.id}>
            <h2 className="font-display text-xl font-semibold text-brand-blue">{section.title}</h2>
            {'paragraph' in section && section.paragraph ? (
              <p className="mt-4 leading-relaxed text-muted">{section.paragraph}</p>
            ) : 'items' in section ? (
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
                {section.items.map((item: string) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </ClayCard>
        </ContentSectionItem>
      ))}
    </ContentSection>
  );
}
