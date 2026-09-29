/**
 * Lagos delivery areas.
 *
 * Every Lagos order is priced per area, because a dispatch rider to Ikeja and
 * one to Ajah are not the same job. This list is the *seed* for the admin
 * pricing table and the fallback for the checkout select — she adds, renames
 * and removes rows from `/admin/delivery`, so read live rates from
 * `DeliveryRepository.options()` wherever you can and fall back to this only
 * before the table is populated.
 *
 * Grouped roughly by how riders actually cost the run: Island runs cost more
 * than Mainland, and the Ajah–Epe corridor more again.
 */

export interface LagosAreaGroup {
  label: string;
  areas: string[];
}

export const LAGOS_AREA_GROUPS: readonly LagosAreaGroup[] = [
  {
    label: "Mainland",
    areas: [
      "Agege",
      "Alimosho",
      "Amuwo-Odofin",
      "Apapa",
      "Ebute Metta",
      "Egbeda",
      "Ejigbo",
      "Festac",
      "Gbagada",
      "Ikeja",
      "Ilupeju",
      "Isolo",
      "Ketu",
      "Maryland",
      "Mushin",
      "Ogba",
      "Ogudu",
      "Oshodi",
      "Shomolu",
      "Surulere",
      "Yaba",
    ],
  },
  {
    label: "Island",
    areas: [
      "Banana Island",
      "Ikoyi",
      "Lagos Island",
      "Lekki Phase 1",
      "Oniru",
      "Victoria Island",
    ],
  },
  {
    label: "Lekki–Epe corridor",
    areas: ["Ajah", "Awoyaya", "Chevron", "Ibeju-Lekki", "Ikate", "Sangotedo"],
  },
  {
    label: "Outskirts",
    areas: ["Badagry", "Epe", "Ikorodu", "Ojo", "Sango Ota"],
  },
] as const;

/** Flat list, for validation and the admin area picker. */
export const LAGOS_AREAS: readonly string[] = LAGOS_AREA_GROUPS.flatMap(
  (g) => g.areas,
);
