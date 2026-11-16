import { ImageResponse } from 'next/og';
import { Wordmark } from '@/components/Wordmark';
import { ISSUE_CATEGORIES } from '@/engine/issues/issue';
import { issueCategories } from '@/features/workspace/issueCategories';
import { PRODUCT_NAME } from '@/features/workspace/productName';

export const alt = `${PRODUCT_NAME}: duplicates, inconsistent values, missing data and suspicious records in a CSV, reviewed by you.`;
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
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        background: WASH,
        backgroundImage: `radial-gradient(circle at center, ${GRID_DOT} 0%, ${GRID_DOT} 14%, transparent 18%)`,
        backgroundSize: '28px 28px',
        color: PRIMARY,
      }}
    >
      <div style={{ display: 'flex', fontSize: 26, letterSpacing: 9 }}>
        AI DATA
      </div>
      <Wordmark style={{ width: 642, height: 156, color: PRIMARY }} />
      <div style={{ display: 'flex', fontSize: 26, letterSpacing: 9 }}>
        ASSISTANT
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 34 }}>
        {ISSUE_CATEGORIES.map((category) => (
          <div
            key={category}
            style={{
              display: 'flex',
              padding: '10px 22px',
              borderRadius: 999,
              background: TINT,
              fontSize: 26,
            }}
          >
            {issueCategories[category].label}
          </div>
        ))}
      </div>
    </div>,
    size
  );
}

// Hex values: the renderer has no stylesheet. They mirror the tokens in globals.css.
const PRIMARY = '#1565c0';
const WASH = '#edf5fe';
const TINT = '#deebfd';
const GRID_DOT = '#c0d5f0';
