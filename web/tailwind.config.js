/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-accent': '#a1d3c0',
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
