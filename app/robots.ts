import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/play/', '/levels/', '/admin/'],
    },
    sitemap: 'https://inference-detective.vercel.app/sitemap.xml',
  }
}
