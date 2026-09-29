import type { AnnouncementsRepository } from "~/utils/types/api";
import type { Announcement } from "~/utils/types/announcement";
import { getSupabase } from "~/utils/supabase";
import mapError from "~/utils/api/mapError";
import { ANNOUNCEMENT_SELECT, rowToAnnouncement } from "~/utils/api/rows";

/**
 * The banner above the header.
 *
 * Only one row can be active at a time — `enforce_single_active_announcement()`
 * deactivates the rest on write — but the query still orders and limits rather
 * than trusting that, because a `maybeSingle()` over two rows is an error and a
 * banner is not worth failing a page render for.
 */
export const supabaseAnnouncementsRepo: AnnouncementsRepository = {
  async active(): Promise<Announcement | null> {
    const { data, error } = await getSupabase()
      .from("announcements")
      .select(ANNOUNCEMENT_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw mapError(error);
    return data ? rowToAnnouncement(data) : null;
  },
};
