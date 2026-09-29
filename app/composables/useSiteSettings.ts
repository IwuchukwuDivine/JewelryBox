import { useQuery } from "@tanstack/vue-query";
import type { PublicSettings } from "~/utils/types/api";
import { PUBLIC_SETTINGS_FALLBACK, whatsappLink } from "~/utils/constants/contact";

export const PUBLIC_SETTINGS_KEY = ["public-settings"] as const;

/**
 * The vendor's contact points, as an admin can change them.
 *
 * Five rows that change roughly never, so `staleTime: Infinity` — one fetch per
 * page load, not one per navigation. `placeholderData` is the compile-time
 * floor, which means:
 *
 *   · `settings` is never undefined, so no caller writes a loading branch;
 *   · SSR and the first client render both emit the same constants, so there is
 *     no hydration mismatch and no layout shift;
 *   · a slow or failed read is indistinguishable from an unchanged one.
 *
 * Deliberately not awaited on the server. Blocking every SSR render on a
 * settings read to print a phone number that has not changed since launch is a
 * bad trade; the query resolves after hydration and updates in place.
 */
export const useSiteSettings = () => {
  const { data } = useQuery<PublicSettings>({
    queryKey: PUBLIC_SETTINGS_KEY,
    staleTime: Number.POSITIVE_INFINITY,
    placeholderData: PUBLIC_SETTINGS_FALLBACK,
    // `publicSettings()` is contracted never to throw; a retry would only
    // repeat a read that already fell back.
    retry: false,
    queryFn: () => settingsRepo.publicSettings(),
  });

  const settings = computed(() => data.value ?? PUBLIC_SETTINGS_FALLBACK);

  return {
    settings,
    /** `wa.me` link with a prefilled message, on whichever number is current. */
    whatsappUrl: (message: string) =>
      whatsappLink(message, settings.value.whatsapp),
  };
};
