import type { ReactNode, ElementType } from 'react';

interface VisuallyHiddenProps {
  children: ReactNode;
  /** Render as a different element (default: span) */
  as?: ElementType;
}

/**
 * Hides content visually while keeping it accessible to screen readers.
 * Uses the standard clip/overflow technique recommended by WebAIM.
 */
export function VisuallyHidden({ children, as: Tag = 'span' }: VisuallyHiddenProps) {
  return (
    <Tag
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: 0,
      }}
    >
      {children}
    </Tag>
  );
}
