import { afterEach, beforeEach, vi } from 'vitest';

const SIZE_PROPERTIES = [
  { name: 'clientWidth', axis: 'width' },
  { name: 'clientHeight', axis: 'height' },
  { name: 'offsetWidth', axis: 'width' },
  { name: 'offsetHeight', axis: 'height' },
] as const;

// jsdom has no layout, so a virtualized list would render nothing. Registers hooks that give
// every element a fixed size.
export function mockLayout({
  width = 1200,
  height = 800,
}: { width?: number; height?: number } = {}): void {
  const originals = SIZE_PROPERTIES.map(({ name }) => ({
    name,
    descriptor: Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
  }));

  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    for (const { name, axis } of SIZE_PROPERTIES) {
      Object.defineProperty(HTMLElement.prototype, name, {
        configurable: true,
        get: () => (axis === 'width' ? width : height),
      });
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const { name, descriptor } of originals) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, name, descriptor);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, name);
      }
    }
  });
}
