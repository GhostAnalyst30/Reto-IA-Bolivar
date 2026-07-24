import Image from 'next/image';
import { cn } from '@/lib/utils';

export function BrandMark({
  showText = true,
  className = '',
}: {
  showText?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-primary p-1.5">
        <Image
          src="/front/utb-logo.png"
          alt="Logo UTB"
          width={28}
          height={28}
          className="h-full w-full object-contain brightness-0 invert"
          priority
        />
      </div>
      {showText && (
        <span className="text-xl font-extrabold tracking-tight text-primary">
          UTB Te Acompaña
        </span>
      )}
    </div>
  );
}
