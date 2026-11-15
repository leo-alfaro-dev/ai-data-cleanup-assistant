import { Dialog } from 'radix-ui';
import { RxCross2 } from 'react-icons/rx';
import { twMerge } from 'tailwind-variants';
import { Button } from './Button';

export type ModalProps = Omit<
  React.ComponentProps<typeof Dialog.Content>,
  'title' | 'onClose'
> & {
  isOpen: boolean;
  title: string;
  description: string;
  isCloseDisabled?: boolean;
  onClose: () => void;
};

export function Modal({
  isOpen,
  title,
  description,
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-text-primary/40" />
        <Dialog.Content
          className={twMerge(
            'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-surface p-5 focus:outline-none',
            className
          )}
          onEscapeKeyDown={keepOpen}
          onPointerDownOutside={keepOpen}
          onInteractOutside={keepOpen}
          {...props}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-base font-semibold">
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
                className="px-2"
                disabled={isCloseDisabled}
              >
                <RxCross2 aria-hidden className="size-4" />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
