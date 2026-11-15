import { Kbd } from '@/components/Kbd';
import { Modal } from '@/components/Modal';
import { SHORTCUTS } from '../shortcuts';
import { helpActions, useIsHelpOpen } from '../state/helpStore';

export type ShortcutHelpProps = Omit<
  React.ComponentProps<typeof Modal>,
  'isOpen' | 'title' | 'description' | 'onClose' | 'children'
>;

export function ShortcutHelp(props: ShortcutHelpProps) {
  const isOpen = useIsHelpOpen();

  return (
    <Modal
      isOpen={isOpen}
      title="Keyboard shortcuts"
      description="Single keys work anywhere except while typing in a field."
      onClose={() => helpActions.close()}
      {...props}
    >
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-sm">
        {SHORTCUTS.map(({ action, display, label }) => (
          <div key={action} className="contents">
            <dt>
              <Kbd>{display}</Kbd>
            </dt>
            <dd className="text-text-secondary">{label}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
