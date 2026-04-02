import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      /* ── Spacing tokens ── */
      spacing: {
        4.5: "1.125rem",     /* 18px */
        13: "3.25rem",       /* 52px */
        15: "3.75rem",       /* 60px */
        18: "4.5rem",        /* 72px */
        sidebar: "18rem",    /* 288px (w-72) — 사이드바 너비 고정 */
      },
      /* ── Layout tokens ── */
      height: {
        nav: "3.5rem",       /* 56px — 상단 네비게이션 높이 */
        "nav-full": "100px", /* 네비게이션 + 서브탭 전체 높이 */
      },
      minHeight: {
        page: "calc(100vh - 100px)",    /* 페이지 콘텐츠 최소 높이 */
        "page-nosub": "calc(100vh - 56px)", /* 서브탭 없는 페이지 (홈) */
      },
      maxWidth: {
        content: "1200px",   /* 단일 레이아웃 최대 너비 */
      },
      /* ── Border-radius tokens ── */
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "1rem",        /* 16px — 카드·패널 라운딩 (rounded-2xl 기준) */
        pill: "9999px",      /* 뱃지·태그·필터칩 */
      },
      /* ── Box-shadow tokens ── */
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06)",  /* 카드 기본 그림자 */
        "card-hover": "0 4px 12px rgba(0,0,0,0.1)", /* 카드 호버 */
        dropdown: "0 4px 16px rgba(0,0,0,0.12)",     /* 드롭다운·모달 */
      },
      /* ── Color tokens ── */
      colors: {
        /* shadcn 기본 CSS-var 색상 (기존 유지) */
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        /* ── 표면 색상 (레이아웃 배경) ── */
        surface: {
          DEFAULT: "#F7F8FA",   /* 페이지 전체 배경 */
          card: "#FFFFFF",      /* 카드·패널 배경 */
          sidebar: "#FFFFFF",   /* 사이드바 배경 */
          inset: "#FAFAFA",     /* 비활성 셀·테이블 헤더 */
          hover: "#F0F1F4",     /* 버튼·셀 호버 배경 */
        },
        /* ── 중성 색상 (텍스트·보더·진행률 트랙) ── */
        neutral: {
          50: "#FAFAFA",
          100: "#F0F1F4",
          200: "#E7E5E4",
          300: "#D1D5DB",
          400: "#AEAEB2",
          500: "#78716C",
          600: "#6E6E73",
          700: "#3F3F46",
          track: "#F0F0F5",     /* 프로그레스 바 트랙 배경 */
          checked: "#9CA3AF",   /* 완료 체크 색상 */
        },

        /* ── 브랜드 메인 컬러 ── */
        brand: {
          DEFAULT: "#006BFE",
          light: "#3389FE",
          dark: "#0055CB",
        },
        /* ── 역할별 컬러 ── */
        pm: {
          DEFAULT: "#fc8b57",
          light: "#fdb997",
          dark: "#e06a30",
        },
        designer: {
          DEFAULT: "#b589e0",
          light: "#d0b5ee",
          dark: "#9462c9",
        },
        "d-10": {
          DEFAULT: "#ef4444",
          light: "#fca5a5",
          dark: "#dc2626",
        },
        /* ── 플랫폼 컬러 ── */
        fitchnic: {
          DEFAULT: "#38BDF8",
          light: "#7DD3FC",
          dark: "#0EA5E9",
        },
        moneyup: {
          DEFAULT: "#22C55E",
          light: "#86EFAC",
          dark: "#16A34A",
        },
      },
      keyframes: {
        fi: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pop: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        fi: "fi 0.3s ease both",
        pop: "pop 0.2s ease both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
