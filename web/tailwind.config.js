/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-accent': '#9d4f3c',
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
