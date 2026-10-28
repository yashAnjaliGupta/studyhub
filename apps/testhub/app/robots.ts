import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_TESTHUB_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://testhub.studyhub.yashguptaiiit.in';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/signin',
          '/signup',
          '/exam/*/detailed-analysis',
          '/exam/*/ai-guidance',
          '/exam/*/submit-confirmation',
          '/exam/*/results',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/exam/*/detailed-analysis',
          '/exam/*/ai-guidance',
          '/exam/*/submit-confirmation',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

