import { tv } from 'tailwind-variants';

export const categoryTone = tv({
  slots: {
    text: '',
    tint: '',
    highlight: '',
  },
  variants: {
    category: {
      duplicate: {
        text: 'text-duplicate',
        tint: 'bg-duplicate/10',
        highlight: 'bg-duplicate/20',
      },
      inconsistent: {
        text: 'text-inconsistent',
        tint: 'bg-inconsistent/10',
        highlight: 'bg-inconsistent/20',
      },
      missing: {
        text: 'text-missing',
        tint: 'bg-missing/10',
        highlight: 'bg-missing/20',
      },
      suspicious: {
        text: 'text-suspicious',
        tint: 'bg-suspicious/10',
        highlight: 'bg-suspicious/20',
      },
    },
  },
});
