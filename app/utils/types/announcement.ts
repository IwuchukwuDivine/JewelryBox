/**
 * Mirrors the `announcements` table — the admin-managed banner above the
 * header. Only one row is active at a time, enforced by a database trigger.
 */
export interface Announcement {
  id: string;
  message: string;
  is_active: boolean;
  created_at: string;
}
