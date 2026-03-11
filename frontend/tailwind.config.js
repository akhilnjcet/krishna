/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#f9f9f9',
                    100: '#f2f2f2',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717', // Dark Gray / Off-Black
                    950: '#000000', // Solid Black
                    accent: '#FFB612', // Caterpillar Yellow
                    accentHover: '#E5A310',
                }
            },
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'], // Solid, heavy-duty sans serif
                display: ['"Barlow Semi Condensed"', 'sans-serif'], // For industrial headings if needed
            },
            boxShadow: {
                'solid': '4px 4px 0px 0px rgba(0,0,0,1)', // Brutalist/Solid shadow
            }
        },
    },
    plugins: [],
}
