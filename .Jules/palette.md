## 2025-05-15 - [Initial Dashboard Accessibility Audit]
**Learning:** The Pactara Universal Action Console uses many icon-only buttons and async feedback mechanisms that are not currently optimized for screen readers.
**Action:** Always add ARIA labels to icon-only buttons and use ARIA live regions for async status updates.

## 2025-05-22 - [Universal Copy Pattern]
**Learning:** High-density dashboards benefit from "action on hover" copy buttons for technical strings (IDs, JSON) to reduce UI clutter while maintaining utility.
**Action:** Use the "group" and "sm:opacity-0 sm:group-hover:opacity-100" pattern for utility buttons in data-heavy views.
