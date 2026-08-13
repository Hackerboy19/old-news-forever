/**
 * Central Theme & Headless System Configuration
 * Preserves legacy CodeIgniter asset paths & branding rules while injecting modern styling primitives.
 */

export const themeConfig = {
  site: {
    name: "Global Gazette & Pageant Times",
    tagline: "Headless News Architecture & Real-Time Editorial Network",
    logo: "assets/img/logo/brand-logo-dark.svg",
    logoLight: "assets/img/logo/brand-logo-light.svg",
    favicon: "assets/img/favicon.ico",
    domain: "https://news.globalgazette.com",
    defaultLanguage: "en",
  },
  typography: {
    fontSans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontDisplay: "Georgia, Cambria, 'Times New Roman', Times, serif",
    fontSize: {
      body: "16px",
      lineHeight: "1.65",
    },
  },
  colors: {
    primary: {
      DEFAULT: "#0F172A", // Slate 900
      light: "#1E293B",
      accent: "#E11D48", // Rose 600
    },
    secondary: {
      DEFAULT: "#2563EB", // Blue 600
      hover: "#1D4ED8",
    },
    neutral: {
      bgLight: "#F8FAFC",
      cardLight: "#FFFFFF",
      borderLight: "#E2E8F0",
      textDark: "#0F172A",
      textMuted: "#64748B",
    },
    adminDark: {
      sidebar: "#0F172A",
      bg: "#0B0F19",
      card: "#1E293B",
      border: "#334155",
      text: "#F8FAFC",
      textSubtle: "#94A3B8",
    },
  },
  adZones: [
    {
      id: "top_banner",
      name: "Top Leaderboard Banner",
      dimensions: "728x90",
      maxHeight: "90px",
      placement: "Header Top",
    },
    {
      id: "sidebar_sticky",
      name: "Sidebar Sticky Rectangle",
      dimensions: "300x600",
      maxHeight: "600px",
      placement: "Article Right Sidebar",
    },
    {
      id: "in_content",
      name: "In-Article Native Ad",
      dimensions: "728x250",
      maxHeight: "250px",
      placement: "Between Paragraphs 3 & 4",
    },
    {
      id: "footer_banner",
      name: "Footer Leaderboard",
      dimensions: "970x90",
      maxHeight: "90px",
      placement: "Footer Sticky Bottom",
    },
  ],
  legacyDatabaseMapping: {
    blogTable: "ci_blog",
    categoryTable: "ci_categories",
    tagTable: "ci_tags",
    adTable: "ci_advertisement",
    activityLogTable: "ci_activity_log",
    userTable: "ci_users",
    subscriberTable: "ci_subscribers",
    settingTable: "ci_settings",
    imageLibraryTable: "ci_image_library",
  },
};

export default themeConfig;
