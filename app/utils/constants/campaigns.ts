import type { ProductFilters } from "~/utils/types/shop";
import { PHOTOS, mockImage } from "~/utils/mock/images";

/**
 * The five editorial campaigns behind `/campaign/[slug]`.
 *
 * Copy is verbatim from the design prototype's Campaign screen. A campaign is
 * purely a piece of merchandising: it owns its words and its hero frame, and
 * selects its pieces with a `ProductFilters` slice rather than a list of IDs,
 * so it keeps working as the catalogue changes.
 *
 * The prototype tagged its campaigns with editorial tags (`valentine`, `her`,
 * `him`) that the real `ProductTag` union does not carry — the catalogue's
 * merchandising vocabulary is `new · moissanite · gift · statement · everyday
 * · limited`. Each campaign is therefore mapped onto the nearest real filter.
 *
 * TODO(Phase F): hero frames come from the mock photo pool. Replace with real
 * campaign photography when product imagery lands in Supabase storage.
 */
export interface CampaignDefinition {
  slug: string;
  /** Marcellus headline, 50px on the hero. */
  title: string;
  /** Accent mono line above the headline. */
  eyebrow: string;
  /** Hero corner metadata, left. "CAMPAIGN · VAL-26". */
  code: string;
  /** Hero corner metadata, right. "01 — 14 FEB". */
  dates: string;
  /** Standfirst under the headline. Doubles as the meta description. */
  intro: string;
  /** The reassurance card below the edit. */
  note: { title: string; body: string };
  /** Which pieces the edit draws. */
  filters: Partial<ProductFilters>;
  heroImage: string;
}

export const CAMPAIGNS: readonly CampaignDefinition[] = [
  {
    slug: "valentine",
    title: "Say it in stone.",
    eyebrow: "The Valentine's Collection",
    code: "CAMPAIGN · VAL-26",
    dates: "01 — 14 FEB",
    intro: "Pieces that arrive sealed, insured, and on time for the fourteenth.",
    note: {
      title: "Gift-wrapped by default",
      body: "Every Valentine's piece ships in the JewelryBox case with a hand-written card. Add the message at checkout; we do the rest.",
    },
    filters: { tag: "moissanite" },
    heroImage: mockImage(PHOTOS.editorial[1]!),
  },
  {
    slug: "wedding",
    title: "For the promise, and the years after.",
    eyebrow: "The Wedding Edit",
    code: "CAMPAIGN · WED-26",
    dates: "ALL SEASON",
    intro: "Solitaires, bands and the pieces that finish the day.",
    note: {
      title: "Private viewings",
      body: "Book an hour in Lekki to see stones side by side under daylight. Bring whoever needs to be there.",
    },
    filters: { category: "rings" },
    heroImage: mockImage(PHOTOS.editorial[3]!),
  },
  {
    slug: "gifting",
    title: "Chosen for someone else.",
    eyebrow: "Gifting",
    code: "CAMPAIGN · GIFT",
    dates: "YEAR ROUND",
    intro: "Pieces that need no explanation and no receipt.",
    note: {
      title: "Exchanges, quietly",
      body: "Any gift can be exchanged within thirty days, no questions, no notification to the giver.",
    },
    filters: { tag: "gift" },
    heroImage: mockImage(PHOTOS.editorial[2]!),
  },
  {
    slug: "newarrivals",
    title: "This month, at the house.",
    eyebrow: "New Arrivals",
    code: "CAMPAIGN · NEW",
    dates: "SEP 2026",
    intro: "The latest additions, photographed the week they arrived.",
    note: {
      title: "First to know",
      body: "Clients on the letter see new pieces three days before they appear here.",
    },
    filters: { tag: "new" },
    heroImage: mockImage(PHOTOS.editorial[2]!),
  },
  {
    slug: "watchedit",
    title: "Chosen for the wrist.",
    eyebrow: "The Watch Edit",
    code: "CAMPAIGN · WATCH",
    dates: "SS·26",
    intro: "Four references, one standard.",
    note: {
      title: "Verified, then verified again",
      body: "Serial, movement and case are checked on arrival and before dispatch. The report ships with the watch.",
    },
    filters: { category: "watches" },
    heroImage: mockImage(PHOTOS.editorial[0]!),
  },
] as const;

/** How many pieces a campaign edit shows before it stops. */
export const CAMPAIGN_PAGE_SIZE = 24;

export const campaignBySlug = (slug: string): CampaignDefinition | undefined =>
  CAMPAIGNS.find((c) => c.slug === slug);

/** Every campaign but this one — the chip rail at the foot of the page. */
export const otherCampaigns = (slug: string): CampaignDefinition[] =>
  CAMPAIGNS.filter((c) => c.slug !== slug);
