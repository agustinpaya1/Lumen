/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-accent': 'var(--lumen-accent, #53653c)',
                'brand-surface': 'var(--lumen-surface, #faf9f3)',
                'brand-ink': 'var(--lumen-ink, #30372b)',
            },
            fontFamily: {
                // "The Seasons" → mapped to Cormorant Garamond (closest free editorial serif)
                // Replace the font-family string if/when local .woff2 files are added.
                'seasons': ['"Cormorant Garamond"', 'Georgia', '"Times New Roman"', 'serif'],
            },
        },
    },
    plugins: [],
}
