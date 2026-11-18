import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Platzhalter-Icon. Ein echtes Vereins-Icon kommt später (public/icon.svg ersetzen).
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0b2545' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0b2545' } },
  },
  images: ['public/icon.svg'],
})
