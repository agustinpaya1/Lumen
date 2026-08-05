import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom', // Soluciona el "document is not defined"
        setupFiles: ['src/test-setup.ts'], // Arranca el motor de Angular
        globals: true,
    },
    resolve: {
        alias: {
            // Soluciona el error de "Cannot find package '@core/constants'"
            '@core': resolve(__dirname, './src/app/core'),
            '@features': resolve(__dirname, './src/app/features'),
            '@environments': resolve(__dirname, './src/environments')
        }
    }
});