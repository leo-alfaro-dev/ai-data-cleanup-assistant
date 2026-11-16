import { Dialog } from 'radix-ui';
import type { IconType } from 'react-icons';
import { RxCross2 } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { BackdropIcon } from './BackdropIcon';
import { Button } from './Button';

export type ModalProps = Omit<
  React.ComponentProps<typeof Dialog.Content>,
  'title' | 'onClose'
> & {
  isOpen: boolean;
  title: string;
  description: string;
  icon: IconType;
  isCloseDisabled?: boolean;
  onClose: () => void;
};

export function Modal({
  isOpen,
  title,
  description,
  icon,
  isCloseDisabled = false,
  onClose,
  children,
  className = '',
  ...props
}: ModalProps) {
  const keepOpen = (event: Event) => {
    if (isCloseDisabled) event.preventDefault();
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(next) => {
        if (!next && !isCloseDisabled) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/35 backdrop-blur-xs" />
        <Dialog.Content
          className={twMerge(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-text-primary/10 focus:outline-none',
            className
          )}
          onEscapeKeyDown={keepOpen}
          onPointerDownOutside={keepOpen}
          onInteractOutside={keepOpen}
          {...props}
        >
          <div className="dot-grid relative flex shrink-0 items-start justify-between gap-4 overflow-hidden border-b border-border bg-wash px-5 py-4">
            <BackdropIcon
              icon={icon}
              className="right-14 -bottom-12 size-28 text-primary/8"
            />
            <div className="relative flex min-w-0 flex-col gap-1">
              <Dialog.Title className="text-lg font-semibold tracking-tight">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-text-secondary">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                aria-label="Close"
                className="relative px-2"
                disabled={isCloseDisabled}
              >
                <RxCross2 aria-hidden className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
