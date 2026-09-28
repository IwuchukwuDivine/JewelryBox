import type { SessionUser } from "~/utils/types/api";
import type { Address } from "~/utils/types/shop";

/** The signed-in fixture. Matches the prototype's account screen. */
export const MOCK_USER: SessionUser = {
  id: "usr_00214",
  email: "adaeze@example.com",
  full_name: "Adaeze Okonkwo",
  phone: "08030000000",
  is_admin: false,
};

/** Password for the mock sign-in. Anything else throws, so the error path is reachable. */
export const MOCK_PASSWORD = "Jewelry1";

export const MOCK_ADDRESSES: (Address & { id: string; is_default: boolean })[] = [
  {
    id: "adr_001",
    is_default: true,
    full_name: "Adaeze Okonkwo",
    email: "adaeze@example.com",
    phone: "08030000000",
    line1: "12 Admiralty Way",
    city: "Lekki",
    state: "Lagos",
    area: "Lekki Phase 1",
    country: "NG",
  },
  {
    id: "adr_002",
    is_default: false,
    full_name: "Adaeze Okonkwo",
    email: "adaeze@example.com",
    phone: "08030000000",
    line1: "Plot 4, Adetokunbo Ademola Crescent",
    line2: "Wuse II",
    city: "Abuja",
    state: "FCT (Abuja)",
    country: "NG",
  },
];
