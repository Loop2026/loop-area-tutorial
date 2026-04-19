/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // LOOP brand — aligned with the mockup_client_dashboard.html reference
        navy: {
          DEFAULT: "#0B1628",
          mid:     "#132040",
          l:       "#1A2B5C",
          dark:    "#060F1E"
        },
        blue: {
          DEFAULT: "#2563EB",
          d:  "#1E40AF",
          m:  "#2563EB",
          l:  "#3B82F6",
          xl: "#BFDBFE"
        },
        mist: "#E8EEFF",
        off:  "#F0F4FF",
        ink: {
          DEFAULT: "#1E293B",
          mid:     "#334155",
          slate:   "#475569",
          muted:   "#64748B"
        },
        paper: {
          DEFAULT: "#FFFFFF",
          soft:    "#F8FAFC",
          border:  "#E2E8F0",
          borderD: "#CBD5E1"
        },
        accent: {
          success: "#059669",
          successL:"#10B981",
          warn:    "#D97706",
          warnL:   "#F59E0B",
          danger:  "#DC2626"
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"]
      },
      fontSize: {
        "2xs": ["10px", "14px"],
        "xs+": ["11px", "16px"]
      },
      letterSpacing: {
        caps:     ".08em",
        capsWide: ".14em",
        capsXWide:".16em"
      },
      boxShadow: {
        card:    "0 1px 2px rgba(15,30,60,.04), 0 2px 10px rgba(15,30,60,.04)",
        cardHov: "0 4px 14px rgba(15,30,60,.06), 0 1px 2px rgba(15,30,60,.04)",
        popup:   "0 10px 40px rgba(15,23,42,.18)"
      },
      borderRadius: {
        xl2: "14px"
      }
    }
  },
  plugins: []
};
