import { defineConfig } from 'wxt'
import preact from '@preact/preset-vite'

export default defineConfig({
    manifest: {
        name: 'Not Legal Advice',
        description:
            'Analyzes privacy policies and terms of service to surface red flags and give you a simple privacy rating.',
        permissions: ['activeTab', 'storage'],
        icons: {
            16: 'icon/16.png',
            32: 'icon/32.png',
            48: 'icon/48.png',
            128: 'icon/128.png',
        },
    },
    vite: () => ({
        plugins: [preact()],
        css: {
            modules: {
                localsConvention: 'camelCase',
            },
        },
    }),
})
