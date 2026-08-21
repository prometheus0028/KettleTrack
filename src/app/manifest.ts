import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KettleTrack',
    short_name: 'KettleTrack',
    description: 'Track who owes the next wash.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1C1C1E',
    theme_color: '#1cc29f',
    icons: [
      {
        src: '/api/manifest-icon?size=192',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/api/manifest-icon?size=512',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
