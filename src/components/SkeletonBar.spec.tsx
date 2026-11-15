import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SkeletonBar } from './SkeletonBar';

describe('SkeletonBar', () => {
  it('pulses, unless motion is reduced, and takes the size it is given', () => {
    const { container } = render(<SkeletonBar className="h-4 w-24" />);

    expect(container.firstElementChild).toHaveClass(
      'animate-pulse',
      'motion-reduce:animate-none',
      'h-4',
      'w-24'
    );
  });

  it('lets a rounding class replace the default one', () => {
    const { container } = render(<SkeletonBar className="rounded-sm" />);

    expect(container.firstElementChild).toHaveClass('rounded-sm');
    expect(container.firstElementChild).not.toHaveClass('rounded-md');
  });
});
