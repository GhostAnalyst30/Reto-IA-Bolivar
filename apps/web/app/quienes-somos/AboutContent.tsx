'use client';

import { ABOUT_BLOCKS } from '@/components/immersive/data/about-content';
import { ClayCard } from '@/components/immersive/clay/ClayCard';
import { ClayButton } from '@/components/immersive/clay/ClayButton';
import { ContentSection, ContentSectionItem } from '@/components/immersive/primitives/ContentSection';
import { cn } from '@/lib/utils';

export function AboutContent() {
  return (
    <>
      <ContentSection gridClassName="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ABOUT_BLOCKS.map((block) => (
          <ContentSectionItem
            key={block.id}
            className={cn(block.colSpan === 2 && 'sm:col-span-2')}
          >
            <ClayCard className="h-full">
              <h2 className="font-display text-xl font-semibold text-brand-blue">{block.title}</h2>
              <p className="mt-3 leading-relaxed text-muted">{block.desc}</p>
            </ClayCard>
          </ContentSectionItem>
        ))}
      </ContentSection>

      <div className="mx-auto mb-20 flex max-w-7xl flex-wrap justify-center gap-4 px-6">
        <ClayButton href="/register/student" size="lg">
          Registro estudiante
        </ClayButton>
        <ClayButton href="/register/institutional" variant="outline" size="lg">
          Registro institucional
        </ClayButton>
      </div>
    </>
  );
}
