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
                    50: '#F5F5F5', // Light Grey (Section Background)
                    100: '#E0E0E0',
                    200: '#C2C2C2',
                    300: '#A3A3A3',
                    400: '#858585',
                    500: '#4A4A4A', // Steel Grey (Industrial feel)
                    600: '#3A3A3A',
                    700: '#2A2A2A',
                    800: '#142A55', 
                    900: '#0A1F44', // Dark Blue (Header/Footer, primary trust)
                    950: '#000000', // Black
                    accent: '#FF6B00', // Safety Orange (Buttons, CTA)
                    accentHover: '#E66000', 
                    highlight: '#FFC107', // Yellow (Highlights/Icons)
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
