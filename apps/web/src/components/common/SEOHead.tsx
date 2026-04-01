import { useEffect } from 'react';

interface SEOHeadProps {
  title: string;
  description: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
}

export function SEOHead({
  title,
  description,
  ogImage = '/og-image.png',
  ogType = 'website',
  canonicalUrl,
  noIndex,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = `${title} | BeetleSense`;
    document.title = fullTitle;

    // Resolve relative OG image paths to absolute URLs
    const baseUrl = 'https://beetlesense-platform-web.vercel.app';
    const resolvedOgImage = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`;

    const tags: { property?: string; name?: string; content: string }[] = [
      { name: 'description', content: description },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: description },
      { property: 'og:image', content: resolvedOgImage },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:type', content: ogType },
      { property: 'og:site_name', content: 'BeetleSense' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: resolvedOgImage },
    ];

    if (canonicalUrl) {
      tags.push({ property: 'og:url', content: canonicalUrl });
    }

    if (noIndex) {
      tags.push({ name: 'robots', content: 'noindex, nofollow' });
    }

    const elements: HTMLElement[] = [];

    for (const tag of tags) {
      const el = document.createElement('meta');
      if (tag.property) el.setAttribute('property', tag.property);
      if (tag.name) el.setAttribute('name', tag.name);
      el.setAttribute('content', tag.content);
      document.head.appendChild(el);
      elements.push(el);
    }

    // Canonical link
    let canonicalEl: HTMLLinkElement | null = null;
    if (canonicalUrl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      canonicalEl.setAttribute('href', canonicalUrl);
      document.head.appendChild(canonicalEl);
    }

    return () => {
      for (const el of elements) {
        el.remove();
      }
      canonicalEl?.remove();
    };
  }, [title, description, ogImage, ogType, canonicalUrl, noIndex]);

  return null;
}
