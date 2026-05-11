// Single source of truth for default navigation permissions.
// Import from here in App.tsx, layout.tsx, and settings.tsx.

export const DEFAULT_NAV_PERMISSIONS = {
  operator: ["/", "/calendar", "/videos"],
  member:   ["/corrida-bonus"],
  creator:  ["/corrida-bonus"],
} satisfies NavPermissions;

export interface NavPermissions {
  operator: string[];
  member:   string[];
  creator:  string[];
}
