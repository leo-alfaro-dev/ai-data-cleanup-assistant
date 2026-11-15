// A worker hears a cancel only between tasks. Throwing is how the canceled work stops; the
// canceled call ignores whatever the method does next.
export async function pauseForCancel(message: {
  isPending: () => boolean;
}): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  if (!message.isPending()) throw new Error('Canceled');
}
