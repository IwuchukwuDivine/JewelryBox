import type {
  Product,
  ProductCategory,
  ProductTag,
  ProductVariant,
  SpecPair,
} from "~/utils/types/shop";
import { PHOTOS, mockImage } from "~/utils/mock/images";

/**
 * The mock catalogue — 28 pieces across all five categories.
 *
 * Deliberately uneven, because the UI has to survive real inventory:
 * two pieces are sold out, two sit at `stock_count: 2` so the "2 left"
 * state renders, three are made to order, and every `COLLECTIONS` entry
 * (Watches · Jewelry · Moissanite · Gifts) resolves to a non-empty grid.
 *
 * `supabase/seed.sql` mirrors this file exactly, so the Phase F swap is
 * invisible. Change one, change the other.
 */

/** Hero photo per piece, plus two supporting frames from the same category. */
const gallery = (category: ProductCategory, heroIndex: number): string[] => {
  const pool = PHOTOS[category];
  const order = [
    heroIndex,
    (heroIndex + 1) % pool.length,
    (heroIndex + 2) % pool.length,
    (heroIndex + 3) % pool.length,
  ];
  return order.map((i) => mockImage(pool[i]!));
};

interface PieceInput {
  slug: string;
  name: string;
  brand: string;
  description: string;
  category: ProductCategory;
  price_ngn: number;
  hero: number;
  specs: SpecPair[];
  tags?: ProductTag[];
  compare_at_ngn?: number | null;
  in_stock?: boolean;
  stock_count?: number | null;
  made_to_order?: boolean;
  featured?: boolean;
  created_at: string;
  variants?: { label: string; options: Record<string, string>; delta?: number; sold?: boolean }[];
}

const piece = (input: PieceInput, index: number): Product => {
  const id = `prd_${String(index + 1).padStart(3, "0")}`;
  return {
    id,
    slug: input.slug,
    name: input.name,
    brand: input.brand,
    description: input.description,
    category: input.category,
    price_ngn: input.price_ngn,
    compare_at_ngn: input.compare_at_ngn ?? null,
    images: gallery(input.category, input.hero),
    specs: input.specs,
    tags: input.tags ?? [],
    in_stock: input.in_stock ?? true,
    stock_count: input.stock_count ?? null,
    made_to_order: input.made_to_order ?? false,
    featured: input.featured ?? false,
    created_at: input.created_at,
    variants: input.variants?.map(
      (v, i): ProductVariant => ({
        id: `${id}_v${i + 1}`,
        product_id: id,
        label: v.label,
        options: v.options,
        price_ngn: input.price_ngn + (v.delta ?? 0),
        in_stock: !v.sold,
        position: i,
      }),
    ),
  };
};

const RAW: PieceInput[] = [
  /* ── Watches ──────────────────────────────────────────────────────── */
  {
    slug: "meridian-automatic-40",
    name: "Meridian Automatic 40",
    brand: "Meridian",
    description:
      "A 40mm automatic with a sector dial and a movement worth servicing thirty years from now. Worn thin under a cuff, heavy enough to notice.",
    category: "watches",
    price_ngn: 1_850_000,
    hero: 0,
    featured: true,
    tags: ["new"],
    created_at: "2026-09-12T09:00:00Z",
    specs: [
      { label: "Movement", value: "Automatic · 38h reserve" },
      { label: "Case", value: "40mm stainless steel" },
      { label: "Crystal", value: "Sapphire, anti-reflective" },
      { label: "Water resistance", value: "50m" },
    ],
    variants: [
      { label: "Oxblood calf · 40mm", options: { strap: "Oxblood calf", size: "40mm" } },
      { label: "Ivory calf · 40mm", options: { strap: "Ivory calf", size: "40mm" } },
      { label: "Steel bracelet · 40mm", options: { strap: "Steel bracelet", size: "40mm" }, delta: 180_000 },
    ],
  },
  {
    slug: "meridian-chronograph",
    name: "Meridian Chronograph",
    brand: "Meridian",
    description:
      "Three registers, a column wheel, and a pusher action that feels mechanical because it is. The dial darkens toward the edge.",
    category: "watches",
    price_ngn: 2_450_000,
    compare_at_ngn: 2_780_000,
    hero: 1,
    tags: ["limited"],
    created_at: "2026-08-30T09:00:00Z",
    specs: [
      { label: "Movement", value: "Automatic chronograph · 48h" },
      { label: "Case", value: "41mm stainless steel" },
      { label: "Crystal", value: "Sapphire, double-domed" },
      { label: "Water resistance", value: "100m" },
    ],
    variants: [
      { label: "Brown calf · 41mm", options: { strap: "Brown calf", size: "41mm" } },
      { label: "Black calf · 41mm", options: { strap: "Black calf", size: "41mm" } },
    ],
  },
  {
    slug: "aster-field-38",
    name: "Aster Field 38",
    brand: "Aster",
    description:
      "The watch you stop thinking about. 38mm, legible at a glance, light enough to sleep in.",
    category: "watches",
    price_ngn: 980_000,
    hero: 2,
    tags: ["everyday", "new"],
    created_at: "2026-09-20T09:00:00Z",
    specs: [
      { label: "Movement", value: "Automatic · 41h reserve" },
      { label: "Case", value: "38mm brushed steel" },
      { label: "Crystal", value: "Sapphire" },
      { label: "Water resistance", value: "100m" },
    ],
  },
  {
    slug: "abyss-diver-300",
    name: "Abyss Diver 300",
    brand: "Abyss",
    description:
      "Rated to 300m and built like it. Ceramic bezel, lumed to read at depth, on a bracelet that tapers properly.",
    category: "watches",
    price_ngn: 1_650_000,
    hero: 3,
    featured: true,
    created_at: "2026-07-18T09:00:00Z",
    specs: [
      { label: "Movement", value: "Automatic · 70h reserve" },
      { label: "Case", value: "42mm steel, ceramic bezel" },
      { label: "Crystal", value: "Sapphire, AR-coated" },
      { label: "Water resistance", value: "300m" },
    ],
    variants: [
      { label: "Steel bracelet · 42mm", options: { strap: "Steel bracelet", size: "42mm" } },
      { label: "Black rubber · 42mm", options: { strap: "Black rubber", size: "42mm" }, delta: -120_000 },
    ],
  },
  {
    slug: "noir-automatic",
    name: "Noir Automatic",
    brand: "Meridian",
    description:
      "Black on black, with only the hands catching light. A dress watch for people who dislike dress watches.",
    category: "watches",
    price_ngn: 1_320_000,
    hero: 4,
    created_at: "2026-06-04T09:00:00Z",
    specs: [
      { label: "Movement", value: "Automatic · 42h reserve" },
      { label: "Case", value: "39mm blackened steel" },
      { label: "Crystal", value: "Sapphire" },
      { label: "Water resistance", value: "30m" },
    ],
  },
  {
    slug: "obsidian-gmt",
    name: "Obsidian GMT",
    brand: "Obsidian",
    description:
      "A second time zone on a fourth hand, for the version of you that keeps Lagos and London in the same glance.",
    category: "watches",
    price_ngn: 2_150_000,
    hero: 9,
    featured: true,
    stock_count: 2,
    tags: ["limited"],
    created_at: "2026-09-02T09:00:00Z",
    specs: [
      { label: "Movement", value: "Automatic GMT · 72h" },
      { label: "Case", value: "40mm steel" },
      { label: "Crystal", value: "Sapphire" },
      { label: "Water resistance", value: "100m" },
    ],
  },
  {
    slug: "heirloom-pocket",
    name: "Heirloom Pocket Watch",
    brand: "Heirloom",
    description:
      "Hand-wound, open-faced, engraved to order. Made after you ask for it, which is the only honest way to sell one.",
    category: "watches",
    price_ngn: 740_000,
    hero: 6,
    made_to_order: true,
    tags: ["limited", "gift"],
    created_at: "2026-05-21T09:00:00Z",
    specs: [
      { label: "Movement", value: "Hand-wound · 44h reserve" },
      { label: "Case", value: "48mm sterling silver" },
      { label: "Crystal", value: "Mineral" },
      { label: "Water resistance", value: "Not rated" },
    ],
  },
  {
    slug: "steel-sport-diver",
    name: "Steel Sport Diver",
    brand: "Abyss",
    description:
      "The bracelet version of the Abyss, in a smaller case. Sold out; the next run lands in the new year.",
    category: "watches",
    price_ngn: 1_450_000,
    hero: 7,
    in_stock: false,
    created_at: "2026-04-11T09:00:00Z",
    specs: [
      { label: "Movement", value: "Automatic · 50h reserve" },
      { label: "Case", value: "39mm steel" },
      { label: "Crystal", value: "Sapphire" },
      { label: "Water resistance", value: "200m" },
    ],
  },

  /* ── Rings ────────────────────────────────────────────────────────── */
  {
    slug: "solitaire-halo-ring",
    name: "Solitaire Halo Ring",
    brand: "Atelier JB",
    description:
      "A brilliant-cut moissanite held in a halo that does the work of a larger stone. Graded on the same scale as diamond.",
    category: "rings",
    price_ngn: 1_200_000,
    hero: 0,
    featured: true,
    tags: ["moissanite", "new"],
    created_at: "2026-09-16T09:00:00Z",
    specs: [
      { label: "Stone", value: "2.0ct moissanite · D–F" },
      { label: "Metal", value: "18k white gold" },
      { label: "Setting", value: "Four-prong halo" },
      { label: "Band", value: "2.2mm, pavé shoulders" },
    ],
    variants: [
      { label: "Size M", options: { size: "M" } },
      { label: "Size N", options: { size: "N" } },
      { label: "Size O", options: { size: "O" }, sold: true },
      { label: "Size P", options: { size: "P" } },
    ],
  },
  {
    slug: "rose-sapphire-halo",
    name: "Rose Sapphire Halo",
    brand: "Atelier JB",
    description:
      "A cushion-cut pink sapphire in rose gold, warm against most skin tones and unmistakable across a room.",
    category: "rings",
    price_ngn: 860_000,
    hero: 1,
    created_at: "2026-08-08T09:00:00Z",
    specs: [
      { label: "Stone", value: "1.4ct pink sapphire" },
      { label: "Metal", value: "18k rose gold" },
      { label: "Setting", value: "Cushion halo" },
      { label: "Band", value: "2.0mm, tapered" },
    ],
    variants: [
      { label: "Size M", options: { size: "M" } },
      { label: "Size N", options: { size: "N" } },
      { label: "Size O", options: { size: "O" } },
    ],
  },
  {
    slug: "stacking-band-trio",
    name: "Stacking Band Trio",
    brand: "Aster",
    description:
      "Three bands, worn together or apart. The set that survives being worn every day for a decade.",
    category: "rings",
    price_ngn: 420_000,
    hero: 2,
    tags: ["everyday", "gift"],
    created_at: "2026-09-24T09:00:00Z",
    specs: [
      { label: "Stone", value: "None" },
      { label: "Metal", value: "18k yellow gold" },
      { label: "Setting", value: "Plain, polished" },
      { label: "Band", value: "1.4mm × 3" },
    ],
  },
  {
    slug: "cabochon-signet",
    name: "Cabochon Signet",
    brand: "Heirloom",
    description:
      "A signet with a domed stone instead of an engraving. Quieter than a crest, and harder to place.",
    category: "rings",
    price_ngn: 380_000,
    hero: 3,
    tags: ["statement"],
    created_at: "2026-07-02T09:00:00Z",
    specs: [
      { label: "Stone", value: "Onyx cabochon" },
      { label: "Metal", value: "14k yellow gold" },
      { label: "Setting", value: "Bezel" },
      { label: "Band", value: "3.0mm signet" },
    ],
  },
  {
    slug: "aurora-cluster-ring",
    name: "Aurora Cluster Ring",
    brand: "Atelier JB",
    description:
      "Seven moissanite stones set close so the fire reads as one surface. Built to your size after you order.",
    category: "rings",
    price_ngn: 690_000,
    hero: 4,
    made_to_order: true,
    tags: ["moissanite"],
    created_at: "2026-06-19T09:00:00Z",
    specs: [
      { label: "Stone", value: "7 × 0.3ct moissanite" },
      { label: "Metal", value: "18k white gold" },
      { label: "Setting", value: "Cluster, shared prong" },
      { label: "Band", value: "1.8mm" },
    ],
  },

  /* ── Necklaces ────────────────────────────────────────────────────── */
  {
    slug: "pearl-strand",
    name: "Akoya Pearl Strand",
    brand: "Heirloom",
    description:
      "Forty-two hand-knotted Akoya pearls, matched for lustre rather than size. The gift that is never wrong.",
    category: "necklaces",
    price_ngn: 520_000,
    hero: 0,
    tags: ["gift"],
    created_at: "2026-08-14T09:00:00Z",
    specs: [
      { label: "Stone", value: "Akoya pearl · 7.5mm" },
      { label: "Metal", value: "14k gold clasp" },
      { label: "Length", value: "45cm" },
      { label: "Clasp", value: "Hidden box" },
    ],
  },
  {
    slug: "azure-pendant",
    name: "Azure Pendant",
    brand: "Atelier JB",
    description:
      "A step-cut aquamarine on a fine cable chain. Blue that reads green in daylight and holds still at night.",
    category: "necklaces",
    price_ngn: 640_000,
    hero: 1,
    featured: true,
    tags: ["new"],
    created_at: "2026-09-26T09:00:00Z",
    specs: [
      { label: "Stone", value: "1.8ct aquamarine" },
      { label: "Metal", value: "18k yellow gold" },
      { label: "Length", value: "42cm, adjustable to 45cm" },
      { label: "Clasp", value: "Spring ring" },
    ],
    variants: [
      { label: "42cm", options: { length: "42cm" } },
      { label: "45cm", options: { length: "45cm" }, delta: 25_000 },
      { label: "50cm", options: { length: "50cm" }, delta: 45_000 },
    ],
  },
  {
    slug: "layered-chain-set",
    name: "Layered Chain Set",
    brand: "Aster",
    description:
      "Two chains at different lengths, spaced so they sit rather than tangle. Worn together, read as one piece.",
    category: "necklaces",
    price_ngn: 340_000,
    hero: 2,
    tags: ["everyday"],
    created_at: "2026-09-08T09:00:00Z",
    specs: [
      { label: "Stone", value: "None" },
      { label: "Metal", value: "18k gold vermeil" },
      { label: "Length", value: "40cm + 46cm" },
      { label: "Clasp", value: "Lobster" },
    ],
  },
  {
    slug: "brilliance-pendant",
    name: "Brilliance Pendant",
    brand: "Atelier JB",
    description:
      "A single moissanite on an almost invisible chain. More fire than diamond, chosen on purpose.",
    category: "necklaces",
    price_ngn: 980_000,
    hero: 3,
    featured: true,
    tags: ["moissanite"],
    created_at: "2026-08-22T09:00:00Z",
    specs: [
      { label: "Stone", value: "1.5ct moissanite · D–F" },
      { label: "Metal", value: "18k white gold" },
      { label: "Length", value: "42cm" },
      { label: "Clasp", value: "Spring ring" },
    ],
    variants: [
      { label: "42cm", options: { length: "42cm" } },
      { label: "45cm", options: { length: "45cm" }, delta: 30_000 },
    ],
  },
  {
    slug: "heart-pendant",
    name: "Petite Heart Pendant",
    brand: "Aster",
    description:
      "Small enough to wear under a collar. The first serious piece most people are given.",
    category: "necklaces",
    price_ngn: 290_000,
    hero: 6,
    tags: ["gift", "everyday"],
    created_at: "2026-09-18T09:00:00Z",
    specs: [
      { label: "Stone", value: "0.25ct pavé moissanite" },
      { label: "Metal", value: "Sterling silver, rhodium" },
      { label: "Length", value: "40cm" },
      { label: "Clasp", value: "Spring ring" },
    ],
  },
  {
    slug: "dynasty-collar",
    name: "Dynasty Collar",
    brand: "Heirloom",
    description:
      "A ceremonial collar in high-karat gold set with rubies. Made to order, and made once.",
    category: "necklaces",
    price_ngn: 2_800_000,
    hero: 9,
    made_to_order: true,
    tags: ["statement", "limited"],
    created_at: "2026-05-30T09:00:00Z",
    specs: [
      { label: "Stone", value: "Ruby · 24 stones" },
      { label: "Metal", value: "22k yellow gold" },
      { label: "Length", value: "38cm collar" },
      { label: "Clasp", value: "Barrel, safety catch" },
    ],
  },

  /* ── Earrings ─────────────────────────────────────────────────────── */
  {
    slug: "sapphire-drop-earrings",
    name: "Sapphire Drop Earrings",
    brand: "Atelier JB",
    description:
      "Pear-cut sapphires below a diamond surround. They move when you do, which is the whole point.",
    category: "earrings",
    price_ngn: 780_000,
    hero: 0,
    tags: ["statement"],
    created_at: "2026-08-02T09:00:00Z",
    specs: [
      { label: "Stone", value: "2 × 1.1ct blue sapphire" },
      { label: "Metal", value: "18k white gold" },
      { label: "Setting", value: "Pear halo, drop" },
      { label: "Fitting", value: "Post and butterfly" },
    ],
  },
  {
    slug: "moissanite-studs",
    name: "Moissanite Studs",
    brand: "Atelier JB",
    description:
      "One carat each, four prongs, nothing else. The pair you stop taking off.",
    category: "earrings",
    price_ngn: 450_000,
    hero: 1,
    featured: true,
    tags: ["moissanite", "everyday"],
    created_at: "2026-09-22T09:00:00Z",
    specs: [
      { label: "Stone", value: "2 × 1.0ct moissanite · D–F" },
      { label: "Metal", value: "18k white gold" },
      { label: "Setting", value: "Four-prong" },
      { label: "Fitting", value: "Screw-back post" },
    ],
  },
  {
    slug: "gold-hoops",
    name: "Classic Gold Hoops",
    brand: "Aster",
    description:
      "Twenty millimetres, hollow so they stay light, polished so they stay bright.",
    category: "earrings",
    price_ngn: 260_000,
    hero: 2,
    tags: ["everyday", "gift"],
    created_at: "2026-09-06T09:00:00Z",
    specs: [
      { label: "Stone", value: "None" },
      { label: "Metal", value: "18k yellow gold" },
      { label: "Setting", value: "Hollow tube, 20mm" },
      { label: "Fitting", value: "Hinged snap" },
    ],
  },
  {
    slug: "azure-heart-drops",
    name: "Azure Heart Drops",
    brand: "Aster",
    description:
      "Faceted blue crystal hearts on a French wire. Two pairs left from the Valentine's run.",
    category: "earrings",
    price_ngn: 310_000,
    hero: 4,
    stock_count: 2,
    tags: ["gift", "limited"],
    created_at: "2026-07-25T09:00:00Z",
    specs: [
      { label: "Stone", value: "Blue topaz · heart cut" },
      { label: "Metal", value: "Sterling silver" },
      { label: "Setting", value: "Bezel drop" },
      { label: "Fitting", value: "French wire" },
    ],
  },

  /* ── Bracelets ────────────────────────────────────────────────────── */
  {
    slug: "tennis-bracelet",
    name: "Moissanite Tennis Bracelet",
    brand: "Atelier JB",
    description:
      "Fifty stones in a continuous line, each set to catch light independently. Weight you notice.",
    category: "bracelets",
    price_ngn: 1_450_000,
    hero: 0,
    featured: true,
    tags: ["moissanite", "statement"],
    created_at: "2026-09-14T09:00:00Z",
    specs: [
      { label: "Stone", value: "50 × 0.1ct moissanite" },
      { label: "Metal", value: "18k rose gold" },
      { label: "Length", value: "18cm" },
      { label: "Clasp", value: "Box with double catch" },
    ],
  },
  {
    slug: "ice-link-bracelet",
    name: "Ice Link Bracelet",
    brand: "Obsidian",
    description:
      "Pavé links that read as solid until they move. Heavier than it looks, on purpose.",
    category: "bracelets",
    price_ngn: 1_150_000,
    compare_at_ngn: 1_340_000,
    hero: 1,
    tags: ["statement"],
    created_at: "2026-06-28T09:00:00Z",
    specs: [
      { label: "Stone", value: "Pavé moissanite" },
      { label: "Metal", value: "18k white gold" },
      { label: "Length", value: "19cm" },
      { label: "Clasp", value: "Push-button box" },
    ],
  },
  {
    slug: "curb-chain-bracelet",
    name: "Curb Chain Bracelet",
    brand: "Aster",
    description:
      "A flat curb link that lies properly against the wrist. Unisex, and better for it.",
    category: "bracelets",
    price_ngn: 480_000,
    hero: 2,
    tags: ["everyday"],
    created_at: "2026-09-10T09:00:00Z",
    specs: [
      { label: "Stone", value: "None" },
      { label: "Metal", value: "18k yellow gold" },
      { label: "Length", value: "20cm" },
      { label: "Clasp", value: "Lobster" },
    ],
  },
  {
    slug: "rose-charm-bracelet",
    name: "Rose Charm Bracelet",
    brand: "Heirloom",
    description:
      "Five charms on a rose gold chain, added to over years rather than bought at once.",
    category: "bracelets",
    price_ngn: 390_000,
    hero: 3,
    tags: ["gift"],
    created_at: "2026-08-18T09:00:00Z",
    specs: [
      { label: "Stone", value: "Mixed cabochons" },
      { label: "Metal", value: "14k rose gold" },
      { label: "Length", value: "18cm" },
      { label: "Clasp", value: "Lobster with extender" },
    ],
  },
  {
    slug: "gold-bangle-stack",
    name: "Gold Bangle Stack",
    brand: "Heirloom",
    description:
      "Four hollow bangles in high-karat gold. Between runs — the next batch is being cast.",
    category: "bracelets",
    price_ngn: 720_000,
    hero: 4,
    in_stock: false,
    tags: ["statement"],
    created_at: "2026-05-09T09:00:00Z",
    specs: [
      { label: "Stone", value: "None" },
      { label: "Metal", value: "22k yellow gold" },
      { label: "Length", value: "6.5cm inner diameter" },
      { label: "Clasp", value: "None, slip-on" },
    ],
  },
];

export const MOCK_PRODUCTS: Product[] = RAW.map(piece);

export const mockProductBySlug = (slug: string): Product | undefined =>
  MOCK_PRODUCTS.find((p) => p.slug === slug);
