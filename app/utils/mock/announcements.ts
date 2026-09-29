import type { Announcement } from "~/utils/types/announcement";

/** Only one row is ever active — the database enforces it with a trigger. */
export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann_001",
    message: "Complimentary insured delivery on orders above ₦1,000,000.",
    is_active: true,
    created_at: "2026-09-01T08:00:00Z",
  },
  {
    id: "ann_002",
    message: "The Wedding Edit is open. Private viewings in Lekki by appointment.",
    is_active: false,
    created_at: "2026-07-14T08:00:00Z",
  },
];
