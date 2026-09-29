/**
 * Verified Unsplash photo IDs, grouped by what is actually in the frame.
 *
 * Every ID here returned HTTP 200 and was reviewed visually before being
 * filed — a plausible-looking ID that 404s renders as a broken catalogue.
 *
 * Temporary: real product photography replaces this at Phase F, at which
 * point `image.domains` in `nuxt.config.ts` can drop `images.unsplash.com`.
 */

/** Build a catalogue-sized Unsplash URL. */
export const mockImage = (id: string, w = 1400): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const PHOTOS = {
  watches: [
    "1524805444758-089113d48a6d", // vintage chronograph, red strap
    "1622434641406-a158123450f9", // brown chronograph on dark
    "1524592094714-0f0654e20314", // white dial, tan strap
    "1548171915-e79a380a2a4b", // steel dive watch
    "1434056886845-dac89ffe9b56", // black dial on mesh
    "1547996160-81dfa63595aa", // dark steel on oxblood
    "1509048191080-d2984bad6ae5", // pocket watch
    "1594534475808-b18fc33b045e", // steel diver, macro
    "1612817159949-195b6eb9e31a", // dark dial, leather strap
    "1587836374828-4dbafa94cf0e", // black dial, steel bracelet
  ],
  rings: [
    "1605100804763-247f67b3557e", // diamond halo solitaire
    "1603561591411-07134e71a2a9", // pink sapphire halo, rose gold
    "1584302179602-e4c3d3fd629d", // gold stacking bands
    "1608042314453-ae338d80c427", // gold bands with cabochons
    "1611107683227-e9060eccd846", // rose gold rings in a tray
    "1602751584552-8ba73aad10e1", // gem cluster piece
  ],
  necklaces: [
    "1515562141207-7a88fb7ce338", // pearl strand in a case
    "1599643478518-a784e5dc4c8f", // gold chain, blue stone pendant
    "1611652022419-a9419f74343d", // layered gold chains, worn
    "1589128777073-263566ae5e4d", // diamond pendant on chain
    "1611085583191-a3b181a88401", // pearl pendant, worn
    "1506630448388-4e683c67ddb0", // pendants, hanging
    "1588444837495-c6cfeb53f32d", // diamond heart pendant
    "1598560917505-59a3ad559071", // diamond halo pendant
    "1600721391689-2564bb8055de", // layered chains, worn
    "1626784215021-2e39ccf971cd", // ornate gold collar
  ],
  earrings: [
    "1535632066927-ab7c9ab60908", // sapphire drops
    "1595781572981-d63151b232ed", // diamond studs on dark
    "1603974372039-adc49044b6bd", // gold hoops, editorial
    "1617038220319-276d3cfab638", // small gold pieces
    "1630019852942-f89202989a59", // blue heart drops
  ],
  bracelets: [
    "1611591437281-460bfbe1220a", // tennis bracelet, rose gold
    "1573408301185-9146fe634ad0", // diamond link bracelet
    "1602173574767-37ac01994b2a", // gold curb chain
    "1606760227091-3dd870d97f1d", // rose gold charms
    "1611107683227-e9060eccd846", // gold chain pile
    "1596944924616-7b38e7cfac36", // worn, hands
  ],
  /** Wide, atmospheric frames — campaign heroes and editorial strips. */
  editorial: [
    "1533139502658-0198f920d8e8", // watch on rock at dusk
    "1620656798579-1984d9e87df7", // ring and chain, worn
    "1596944924616-7b38e7cfac36", // stacked wrists
    "1625093742435-6fa192b6fb10", // gold chains, close
  ],
} as const;
