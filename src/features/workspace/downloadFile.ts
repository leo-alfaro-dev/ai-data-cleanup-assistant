export function downloadFile({
  name,
  text,
  type = 'text/csv',
}: {
  name: string;
  text: string;
  type?: 'text/csv' | 'application/json';
}): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: `${type};charset=utf-8` })
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

// A large download can still be reading the object when the click returns.
const REVOKE_DELAY_MS = 30_000;
