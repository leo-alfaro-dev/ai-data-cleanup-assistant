import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisibleValue } from './VisibleValue';

describe('VisibleValue', () => {
  it('marks a leading space and keeps the text', () => {
    const { container } = render(<VisibleValue value=" Ada" />);

    expect(screen.getAllByRole('img', { name: 'space' })).toHaveLength(1);
    expect(container).toHaveTextContent('·Ada');
  });

  it('marks every trailing space', () => {
    render(<VisibleValue value="Ada   " />);

    expect(screen.getAllByRole('img', { name: 'space' })).toHaveLength(3);
  });

  it('marks a non-breaking space inside the text, apart from a plain space', () => {
    const { container } = render(<VisibleValue value={'Ada\u00a0Lovelace'} />);

    expect(
      screen.getByRole('img', { name: 'non-breaking space' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: 'space' })
    ).not.toBeInTheDocument();
    expect(container).toHaveTextContent('Ada°Lovelace');
  });

  it('marks a tab wherever it is', () => {
    render(<VisibleValue value={'Ada\tLovelace'} />);

    expect(screen.getByRole('img', { name: 'tab' })).toBeInTheDocument();
  });

  it('marks a line break and keeps the value on one line', () => {
    const { container } = render(<VisibleValue value={'Ada\nLovelace'} />);

    expect(screen.getByRole('img', { name: 'line break' })).toBeInTheDocument();
    expect(container.textContent).toBe('Ada↵Lovelace');
  });

  it('marks other whitespace, such as an em space, wherever it sits', () => {
    render(<VisibleValue value={'Ada Lovelace'} />);

    expect(
      screen.getByRole('img', { name: 'other space' })
    ).toBeInTheDocument();
  });

  it('leaves spaces between words as they are', () => {
    const { container } = render(<VisibleValue value="Ada Lovelace" />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(container).toHaveTextContent('Ada Lovelace');
  });

  it('marks every character of a value that is only spaces', () => {
    render(<VisibleValue value="   " />);

    expect(screen.getAllByRole('img', { name: 'space' })).toHaveLength(3);
  });

  it('shows an empty value as a muted mark, apart from the text "empty"', () => {
    const { rerender } = render(<VisibleValue value="" />);
    const mark = screen.getByText('empty');

    expect(mark).toHaveClass('italic');

    rerender(<VisibleValue value="empty" />);

    expect(screen.getByText('empty')).not.toHaveClass('italic');
  });

  it('shows N/A as text, not as an empty value', () => {
    render(<VisibleValue value="N/A" />);

    expect(screen.getByText('N/A')).not.toHaveClass('italic');
  });

  it('renders markup in a value as text', () => {
    const { container } = render(<VisibleValue value="<b>bold</b>" />);

    expect(container.querySelector('b')).toBeNull();
    expect(container).toHaveTextContent('<b>bold</b>');
  });

  it('keeps characters outside the basic plane in order next to a marked space', () => {
    const { container } = render(<VisibleValue value={'😀 ok '} />);

    expect(container).toHaveTextContent('😀 ok·');
  });
});
