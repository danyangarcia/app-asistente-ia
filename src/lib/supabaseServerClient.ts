import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export const supabaseServerClient = createServerActionClient({
  cookies,
});
