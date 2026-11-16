import { twMerge } from 'tailwind-variants';
import { eyebrow } from '@/components/eyebrow';
import { Wordmark } from '@/components/Wordmark';
import { PRODUCT_NAME } from '../productName';

export type MastheadProps = React.ComponentProps<'header'>;

export function Masthead({ className = '', ...props }: MastheadProps) {
  return (
    <header
      className={twMerge(
        'dot-grid flex justify-center border-b border-border bg-wash px-4 py-5 sm:py-6',
        className
      )}
      {...props}
    >
      <h1 className="flex flex-col items-center gap-2">
        <span className="sr-only">{PRODUCT_NAME}</span>
        <span
          aria-hidden
          className={eyebrow({ className: 'tracking-[0.3em]' })}
        >
          AI data
        </span>
        <Wordmark className="h-12 text-primary sm:h-14" />
        <span
          aria-hidden
          className={eyebrow({ className: 'tracking-[0.3em]' })}
        >
          Assistant
        </span>
      </h1>
    </header>
  );
}
