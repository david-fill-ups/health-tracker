export const GLOBAL_NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "◎" },
  { label: "Profiles", href: "/profiles", icon: "👤" },
];

export const NAV_SECTIONS = [
  {
    label: "Care",
    items: [
      { label: "Visits", href: "/visits", icon: "📅" },
      { label: "Care Team", href: "/healthcare-team", icon: "🏥" },
    ],
  },
  {
    label: "My Health",
    items: [
      { label: "Conditions", href: "/conditions", icon: "📋" },
      { label: "Allergies", href: "/allergies", icon: "🌿" },
    ],
  },
  {
    label: "Treatments",
    items: [
      { label: "Medications", href: "/medications", icon: "💊" },
      { label: "Vaccinations", href: "/vaccinations", icon: "💉" },
    ],
  },
  {
    label: "Tracking",
    items: [
      { label: "Health Metrics", href: "/health-metrics", icon: "📊" },
      { label: "Family History", href: "/family-history", icon: "🧬" },
    ],
  },
  {
    label: "Admin",
    items: [{ label: "Wallet", href: "/wallet", icon: "🪪" }],
  },
];
