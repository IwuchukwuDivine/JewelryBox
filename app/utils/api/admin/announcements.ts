import type { AdminAnnouncementsRepository } from "~/utils/types/api";
import type { Announcement } from "~/utils/types/announcement";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import { ANNOUNCEMENT_SELECT, rowToAnnouncement } from "~/utils/api/rows";

/**
 * The banner, admin side.
 *
 * Activating one deactivates the rest — `enforce_single_active_announcement()`
 * does it in a BEFORE trigger, so there is no read-modify-write here and two
 * admins racing cannot leave two banners live.
 */
export const supabaseAdminAnnouncementsRepo: AdminAnnouncementsRepository = {
  async list(): Promise<Announcement[]> {
    const { data, error } = await getSupabase()
      .from("announcements")
      .select(ANNOUNCEMENT_SELECT)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
    if (error) throw mapError(error);
    return (data ?? []).map(rowToAnnouncement);
  },

  /** Created inactive; `setActive()` is the deliberate second step. */
  async create(message: string): Promise<Announcement> {
    const { data, error } = await getSupabase()
      .from("announcements")
      .insert({ message: message.trim(), is_active: false })
      .select(ANNOUNCEMENT_SELECT)
      .single();
    if (error) throw mapError(error);
    return rowToAnnouncement(data);
  },

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await getSupabase()
      .from("announcements")
      .update({ is_active: isActive })
      .eq("id", id);
    if (error) throw mapError(error);
  },

  async remove(id: string): Promise<void> {
    const { error } = await getSupabase()
      .from("announcements")
      .delete()
      .eq("id", id);
    if (error) throw mapError(error);
  },
};
