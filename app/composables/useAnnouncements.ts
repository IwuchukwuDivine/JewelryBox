import { useQuery } from "@tanstack/vue-query";
import type { Announcement } from "~/utils/types/announcement";

export const ACTIVE_ANNOUNCEMENT_KEY = ["active-announcement"] as const;

/**
 * The banner above the header. Decorative, so a failure resolves to `null`
 * rather than throwing — a broken announcement must never take down a page.
 */
export const useActiveAnnouncementQuery = () =>
  useQuery<Announcement | null>({
    queryKey: ACTIVE_ANNOUNCEMENT_KEY,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        return await announcementsRepo.active();
      } catch (error) {
        log.error("announcement fetch failed", error);
        return null;
      }
    },
  });
