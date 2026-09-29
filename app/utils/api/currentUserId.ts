import { getSupabase } from "~/utils/supabase";

/**
 * The signed-in user's id, or null.
 *
 * Read from the stored session rather than `auth.getUser()`, which is a network
 * round trip to GoTrue — these repositories call it before writes that RLS
 * already scopes, so the id is only needed to fill a `user_id` column the table
 * has no default for.
 */
export default async (): Promise<string | null> => {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.user.id ?? null;
};
