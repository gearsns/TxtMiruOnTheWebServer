import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config'; // さっきのビルド用設定を読み込む

export default mergeConfig(
    viteConfig, // ビルド用の設定（プラグインやパス解決）をベースに引き継ぐ
    defineConfig({
        test: {
            environment: 'jsdom',
            globals: true,
            projects: [
                {
                    extends: true,
                    test: {
                        name: 'node-unit',
                        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
                        exclude: ['src/**/*.browser.test.ts', 'src/**/*.browser.test.tsx'],
                        environment: 'jsdom',
                        setupFiles: './src/test/setup.ts',
                    }
                }
            ]
        }
    })
);
