import { cn } from '@/lib/utils';

interface AnimatedGradientTextProps {
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'h1' | 'h2' | 'p';
}

export function AnimatedGradientText({ children, className, as: Tag = 'span' }: AnimatedGradientTextProps) {
  return (
    <Tag
      className={cn(
        'bg-gradient-to-r from-brand-blue via-brand-blue-mid to-brand-amber bg-clip-text text-transparent animate-gradient-text',
        className
      )}
    >
      {children}
    </Tag>
  );
}
