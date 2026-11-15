import { ImageResponse } from 'next/og';
import { issueCategories } from '@/features/workspace/issueCategories';
import type { IssueCategory } from '@/engine/issues/issue';

export const alt =
  'AI Data Cleanup Assistant: duplicates, inconsistent values, missing data and suspicious records in a CSV, reviewed by you.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: '#f6f6f7',
        color: '#18181b',
      }}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {CATEGORY_COLORS.map(({ category, color }) => (
          <div
            key={category}
            style={{
              display: 'flex',
              padding: '10px 22px',
              borderRadius: 10,
              fontSize: 28,
              fontWeight: 600,
              color,
              background: '#ffffff',
              border: `2px solid ${color}`,
            }}
          >
            {issueCategories[category].label}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>
          AI Data Cleanup Assistant
        </div>
        <div style={{ fontSize: 36, color: '#52525b' }}>
          Upload a CSV. Review each suggestion. Export the cleaned file.
        </div>
      </div>
    </div>,
    size
  );
}

// Hex values: the renderer has no stylesheet. They mirror the category tokens in globals.css.
const CATEGORY_COLORS: { category: IssueCategory; color: string }[] = [
  { category: 'duplicate', color: '#6d28d9' },
  { category: 'inconsistent', color: '#1d4ed8' },
  { category: 'missing', color: '#0e7490' },
  { category: 'suspicious', color: '#92400e' },
];
