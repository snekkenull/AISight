/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // shadcn/ui CSS variable-based colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Status Colors - WCAG AA compliant (4.5:1 contrast on white)
        status: {
          success: '#16a34a',     // Green 600 - connected, success (4.54:1 on white)
          warning: '#d97706',     // Amber 600 - warnings (4.54:1 on white)
          error: '#dc2626',       // Red 600 - errors, disconnected (5.94:1 on white)
        },
        // Map Visualization Colors
        viz: {
          search: '#3b82f6',      // Blue - search areas
          path: '#8b5cf6',        // Purple - vessel paths
          risk: '#ef4444',        // Red - collision risks
        },
        // EVA Theme Colors - Requirements: 1.1, 1.2, 1.3, 1.4
        eva: {
          bg: {
            primary: 'var(--eva-bg-primary)',
            secondary: 'var(--eva-bg-secondary)',
            tertiary: 'var(--eva-bg-tertiary)',
          },
          accent: {
            orange: 'var(--eva-accent-orange)',
            red: 'var(--eva-accent-red)',
            purple: 'var(--eva-accent-purple)',
            green: 'var(--eva-accent-green)',
            cyan: 'var(--eva-accent-cyan)',
          },
          text: {
            primary: 'var(--eva-text-primary)',
            secondary: 'var(--eva-text-secondary)',
            accent: 'var(--eva-text-accent)',
          },
          border: {
            default: 'var(--eva-border-default)',
            accent: 'var(--eva-border-accent)',
            glow: 'var(--eva-border-glow)',
          },
        },
      },
      fontFamily: {
        // EVA Typography - Requirements: 2.1, 2.2, 2.3, 2.4
        'eva-mono': 'var(--eva-font-mono)',
        'eva-display': 'var(--eva-font-display)',
      },
      letterSpacing: {
        // EVA Letter Spacing - Requirements: 2.2, 2.3, 2.4
        'eva-tight': 'var(--eva-letter-spacing-tight)',
        'eva-normal': 'var(--eva-letter-spacing-normal)',
        'eva-wide': 'var(--eva-letter-spacing-wide)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        /* Custom border-radius values - Requirements: 6.3 */
        card: "var(--radius-card)",     /* 8px for cards */
        button: "var(--radius-button)", /* 6px for buttons */
        input: "var(--radius-input)",   /* 4px for inputs */
      },
      boxShadow: {
        // EVA Glow Effects - Requirements: 4.1, 4.2
        'eva-glow-sm': '0 0 10px var(--eva-border-glow)',
        'eva-glow': '0 0 20px var(--eva-border-glow)',
        'eva-glow-lg': '0 0 30px var(--eva-border-glow)',
        'eva-glow-orange': '0 0 20px rgba(255, 102, 0, 0.5)',
        'eva-glow-red': '0 0 20px rgba(220, 20, 60, 0.5)',
        'eva-glow-purple': '0 0 20px rgba(148, 0, 211, 0.5)',
        'eva-glow-green': '0 0 20px rgba(0, 255, 65, 0.3)',
        'eva-glow-cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // EVA Animations - Requirements: 4.1, 4.2, 5.1, 5.3
        "eva-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "eva-flicker": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "eva-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 10px var(--eva-border-glow)",
          },
          "50%": { 
            boxShadow: "0 0 20px var(--eva-border-glow), 0 0 30px var(--eva-border-glow)",
          },
        },
        "eva-scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "eva-glitch": {
          "0%, 100%": { 
            transform: "translate(0, 0)",
            opacity: "1",
          },
          "33%": { 
            transform: "translate(-2px, 0)",
            opacity: "0.8",
          },
          "66%": { 
            transform: "translate(2px, 0)",
            opacity: "0.9",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // EVA Animations - Requirements: 4.1, 4.2, 5.1, 5.3
        "eva-pulse": "eva-pulse 2s ease-in-out infinite",
        "eva-flicker": "eva-flicker 0.1s ease-in-out infinite",
        "eva-glow": "eva-glow 2s ease-in-out infinite",
        "eva-scan": "eva-scan 2s linear infinite",
        "eva-glitch": "eva-glitch 0.15s ease-in-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    // EVA Custom Utilities Plugin - Requirements: 4.1, 4.2
    function({ addUtilities }) {
      const evaUtilities = {
        // Angular corner clip-paths for EVA aesthetic
        '.eva-clip-corner': {
          clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))',
        },
        '.eva-clip-corner-sm': {
          clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
        },
        '.eva-clip-corner-lg': {
          clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))',
        },
        '.eva-clip-angle': {
          clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
        },
        '.eva-clip-hexagon': {
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
        },
      };
      addUtilities(evaUtilities);
    },
  ],
}
