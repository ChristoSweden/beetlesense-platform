import { useEffect } from 'react';

export function useDocumentTitle(title: string, suffix = 'BeetleSense.ai') {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title ? `${title} | ${suffix}` : suffix;
    return () => {
      document.title = prevTitle;
    };
  }, [title, suffix]);
}
