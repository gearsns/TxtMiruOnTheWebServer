import { defineConfig } from 'vite';
import pkg from './package.json'
import bookmarklet from 'vite-plugin-bookmarklet';
import { resolve } from 'path';

const currentSite = process.env.SITE_NAME || 'narou';

export default defineConfig({
    resolve: {
        tsconfigPaths: true
    },
    plugins: [
        bookmarklet(),
        {
            name: 'html-transform',
            transformIndexHtml(html: string) {
                return html.replace('__BUILD_DATE__', new Date().toLocaleString('ja-JP'));
            },
        },
        {
            name: 'minify-html-raw',
            transform(code: string, id: string) {
                // .html?raw というクエリがついたファイルをフック
                if (id.endsWith('.html?raw')) {
                    // 簡易的な圧縮：改行と余分な空白を削除
                    const minified = code
                        .replace(/\\n/g, '')         // 改行を消す
                        .replace(/\s{2,}/g, ' ')     // 2つ以上の空白を1つに
                        .replace(/>\s+</g, '><')    // タグ間の空白を消す
                        .replace(/__PACKAGE_VERSION__/g, pkg.version)
                        .replace(/__BUILD_DATE__/g, new Date().toLocaleString('ja-JP'));
                    return { code: minified };
                }
            }
        }
    ],
    build: {
        // 圧縮して1行にする
        minify: true,
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
            input: resolve(__dirname, `src/sites/${currentSite}/main.ts`),
            output: {
                // 外部の不要なラッパーを消す
                format: 'iife',
                entryFileNames: `${currentSite}.js`
            }
        }
    },
    define: {
        // JS内で使用できるグローバル変数を定義
        __BUILD_DATE__: JSON.stringify(new Date().toLocaleString('ja-JP')),
        'import.meta.env.PACKAGE_VERSION': JSON.stringify(pkg.version)
    },
});
