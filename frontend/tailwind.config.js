/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#1E3A8A',    // Deep Blue
                secondary: '#3B82F6',  // Sky Blue
                accent: '#60A5FA',     // Light Blue
                cta: '#2563EB',        // Bright Blue
                ctaHover: '#1D4ED8',   // Darker Blue
                surface: '#F1F5F9',    // Very Light Blue
                textMain: '#374151',   // Dark Gray
                brand: {
                    50: '#F8FAFC',
                    100: '#F1F5F9',
                    200: '#E2E8F0',
                    800: '#1E3A8A', 
                    900: '#0F172A',
                    950: '#020617', // Deeper for Dark Mode background
                },
                dark: {
                    bg: '#020617',
                    surface: '#0B1222',
                    border: '#1E293B',
                    text: '#F1F5F9',
                    muted: '#94A3B8'
                }
            },
            fontFamily: {
                sans: ['"Inter"', 'sans-serif'],
                poppins: ['"Poppins"', 'sans-serif'],
            },
            boxShadow: {
                'solid': '4px 4px 0px 0px rgba(0,0,0,1)', // Brutalist/Solid shadow
            }
        },
    },
    plugins: [],
}
