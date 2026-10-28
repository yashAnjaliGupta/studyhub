import { MetadataRoute } from 'next';
import { client } from '@repo/db/client';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://studyhub.yashguptaiiit.in';

  // 1. Core High-Priority Marketing & Indexing Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/CBSE`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/JEE`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  try {
    // 2. Dynamic Exam / Class combinations from BookChapter and File tables
    const [bookClasses, paperClasses] = await Promise.all([
      client.bookChapter.findMany({
        select: { board: true, className: true },
        distinct: ['board', 'className'],
      }),
      client.file.findMany({
        select: { exam: true, className: true },
        distinct: ['exam', 'className'],
      }),
    ]);

    const classSet = new Set<string>();
    const classRoutes: MetadataRoute.Sitemap = [];

    for (const item of bookClasses) {
      const key = `${item.board}/${item.className}`;
      if (!classSet.has(key)) {
        classSet.add(key);
        classRoutes.push({
          url: `${baseUrl}/${encodeURIComponent(item.board)}/${encodeURIComponent(item.className)}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.85,
        });
      }
    }

    for (const item of paperClasses) {
      const key = `${item.exam}/${item.className}`;
      if (!classSet.has(key)) {
        classSet.add(key);
        classRoutes.push({
          url: `${baseUrl}/${encodeURIComponent(item.exam)}/${encodeURIComponent(item.className)}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.85,
        });
      }
    }

    // 3. Dynamic Subject routes
    const subjects = await client.bookChapter.findMany({
      select: { board: true, className: true, subjectName: true },
      distinct: ['board', 'className', 'subjectName'],
    });

    const subjectRoutes: MetadataRoute.Sitemap = subjects.map((item) => ({
      url: `${baseUrl}/${encodeURIComponent(item.board)}/${encodeURIComponent(item.className)}/${encodeURIComponent(item.subjectName)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    // 4. Dynamic Books & Question Paper routes
    const books = await client.bookChapter.findMany({
      select: { board: true, className: true, subjectName: true, bookName: true },
      distinct: ['board', 'className', 'subjectName', 'bookName'],
    });

    const bookRoutes: MetadataRoute.Sitemap = books.map((b) => ({
      url: `${baseUrl}/${encodeURIComponent(b.board)}/${encodeURIComponent(b.className)}/${encodeURIComponent(b.subjectName)}/${encodeURIComponent(b.bookName)}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.75,
    }));

    return [...staticRoutes, ...classRoutes, ...subjectRoutes, ...bookRoutes];
  } catch (err) {
    console.error('[StudyHub Sitemap] Error querying database for sitemap:', err);
    return staticRoutes;
  }
}

