import { supabase } from "./supabaseClient";
import { logActivity } from "./logActivity";

export async function signOutWithLog() {
  const { data } = await supabase.auth.getSession();
  const user = data?.session?.user;

  if (user?.id) {
    await logActivity("LOGOUT", {
      userId: user.id,
      email: user.email,
    }).catch(() => {});
  }

  await supabase.auth.signOut();
}