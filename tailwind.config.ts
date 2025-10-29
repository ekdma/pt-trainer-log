import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        // ✅ 전역 폰트로 나눔고딕을 우선 지정
        sans: [
          "Nanum Gothic",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],

        // ✅ 환경변수 기반 폰트도 동일하게 매핑
        montserrat: ["var(--font-montserrat)", "sans-serif"],
        nanum: [
          "var(--font-nanum-gothic)",
          "Nanum Gothic",
          "Apple SD Gothic Neo",
          "Malgun Gothic",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [require("tailwind-scrollbar-hide")],
};

export default config;
