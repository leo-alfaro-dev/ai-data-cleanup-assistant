import { RxKeyboard } from 'react-icons/rx';
import { Kbd } from '@/components/Kbd';
import { Modal } from '@/components/Modal';
import { SHORTCUTS } from '../shortcuts';
import { helpActions, useIsHelpOpen } from '../state/helpStore';

export type ShortcutHelpProps = Omit<
  React.ComponentProps<typeof Modal>,
  'isOpen' | 'title' | 'icon' | 'description' | 'onClose' | 'children'
>;

export function ShortcutHelp(props: ShortcutHelpProps) {
  const isOpen = useIsHelpOpen();

  return (
    <Modal
      isOpen={isOpen}
      title="Keyboard shortcuts"
      description="Single keys work anywhere except while typing in a field."
      icon={RxKeyboard}
      onClose={() => helpActions.close()}
      {...props}
    >
      <dl className="flex flex-col divide-y divide-border text-sm">
        {SHORTCUTS.map(({ action, display, label }) => (
          <div
            key={action}
            className="flex flex-row-reverse items-center justify-between gap-4 py-2 first:pt-0 last:pb-0"
          >
            <dt className="shrink-0">
              <Kbd className="min-w-6 text-text-primary">{display}</Kbd>
            </dt>
            <dd className="text-text-secondary">{label}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
