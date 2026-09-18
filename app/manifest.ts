import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NexaAI — Intelligent AI Workspace',
    short_name: 'NexaAI',
    description: 'A secure AI workspace for conversations, research, files, and workflows.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#070b14',
    theme_color: '#070b14',
    categories: ['productivity', 'business', 'utilities'],
    icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
  };
}
