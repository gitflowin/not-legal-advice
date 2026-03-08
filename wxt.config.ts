import { defineConfig } from 'wxt'
import preact from '@preact/preset-vite'
import type { Plugin } from 'vite'

/** Rewrite absolute asset paths to relative in HTML files for Chrome extensions */
function relativeHtmlPaths(): Plugin {
    return {
        name: 'relative-html-paths',
        enforce: 'post',
        transformIndexHtml(html) {
            return html.replace(
                /(src|href)="\/(?!\/)/g,
                '$1="./',
            )
        },
    }
}

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
        plugins: [preact(), relativeHtmlPaths()],
        css: {
            modules: {
                localsConvention: 'camelCase',
            },
        },
    }),
})
