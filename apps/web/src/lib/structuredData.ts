/* JSON-LD structured data generators for BeetleSense.ai */

export function generateOrganizationLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'BeetleSense',
    url: 'https://beetlesense.ai',
    logo: 'https://beetlesense.ai/og-image.png',
    description:
      'AI-powered bark beetle detection and forest health monitoring for Swedish forestry.',
    foundingDate: '2025',
    sameAs: [],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: 'https://beetlesense.ai',
    },
  };
}

export function generateSoftwareApplicationLD() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BeetleSense.ai',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    url: 'https://beetlesense.ai',
    description:
      'AI-powered forest intelligence platform for bark beetle detection, forest health monitoring, and timber volume estimation.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'SEK',
      description: 'Free tier available',
    },
    creator: {
      '@type': 'Organization',
      name: 'BeetleSense',
    },
  };
}

interface BlogPostInput {
  title: string;
  description: string;
  slug: string;
  published_at: string;
  author: string;
  coverUrl?: string | null;
}

export function generateBlogPostLD(post: BlogPostInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    url: `https://beetlesense.ai/blog/${post.slug}`,
    datePublished: post.published_at,
    image: post.coverUrl || 'https://beetlesense.ai/og-image.png',
    author: {
      '@type': 'Person',
      name: post.author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'BeetleSense',
      logo: {
        '@type': 'ImageObject',
        url: 'https://beetlesense.ai/og-image.png',
      },
    },
  };
}

interface FAQItem {
  question: string;
  answer: string;
}

export function generateFAQLD(faqs: FAQItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbLD(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
