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
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
