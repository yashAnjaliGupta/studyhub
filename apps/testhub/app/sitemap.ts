import { MetadataRoute } from 'next';
import { client } from '@repo/db/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl =
    process.env.NEXT_PUBLIC_TESTHUB_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://testhub.studyhub.yashguptaiiit.in';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/papers`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/questions`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ];

  try {
    // 1. All active papers
    const papers = await client.paper.findMany({
      select: {
        id: true,
        updatedAt: true,
      },
      take: 1000,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const paperRoutes: MetadataRoute.Sitemap = papers.map((p) => ({
      url: `${baseUrl}/papers/${encodeURIComponent(p.id)}`,
      lastModified: p.updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // 2. All topics by subject
    const topics = await client.topic.findMany({
      select: {
        name: true,
        subject: true,
        updatedAt: true,
      },
      take: 500,
    });

    const topicRoutes: MetadataRoute.Sitemap = topics.map((t) => ({
      url: `${baseUrl}/questions/${encodeURIComponent(t.subject)}/${encodeURIComponent(t.name)}`,
      lastModified: t.updatedAt || new Date(),
      changeFrequency: 'weekly',
      priority: 0.75,
    }));

    return [...staticRoutes, ...paperRoutes, ...topicRoutes];
  } catch (err) {
    console.error('[TestHub Sitemap] Error querying database for sitemap:', err);
    return staticRoutes;
  }
}

