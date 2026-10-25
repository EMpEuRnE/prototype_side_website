"use server";

import { redirect } from "next/navigation";
import { getSiteUrl, getSupabasePublicConfig } from "@/lib/env";
import { getSafeInternalPath } from "@/lib/auth/redirects";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function getField(formData: FormData, name: string, shouldTrim = true) {
  const value = formData.get(name);
  if (typeof value !== "string") return "";
  return shouldTrim ? value.trim() : value;
}

async function safeRequest<T>(request: () => PromiseLike<T>): Promise<T | null> {
  try {
    return await request();
  } catch {
    return null;
  }
}

export async function signInAction(formData: FormData) {
  const email = getField(formData, "email").toLowerCase();
  const password = getField(formData, "password", false);
  const nextPath = getSafeInternalPath(formData.get("next"), "/profile");

  if (!getSupabasePublicConfig()) redirect("/login?error=setup");
  if (!email || email.length > 254 || !password || password.length > 128) {
    redirect("/login?error=credentials");
  }

  const supabase = await createClient();
  const result = await safeRequest(() => supabase.auth.signInWithPassword({ email, password }));
  if (!result || result.error) redirect("/login?error=credentials");
  redirect(nextPath);
}

export async function signUpAction(formData: FormData) {
  const fullName = getField(formData, "fullName");
  const email = getField(formData, "email").toLowerCase();
  const password = getField(formData, "password", false);

  if (!getSupabasePublicConfig()) redirect("/register?error=setup");
  if (!fullName || fullName.length > 80 || !email || email.length > 254 || password.length < 8 || password.length > 128) {
    redirect("/register?error=invalid-input");
  }

  const supabase = await createClient();
  const result = await safeRequest(() => supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/profile`,
        data: { full_name: fullName },
      },
    }));

  if (!result || result.error) redirect("/register?error=signup");
  if (result.data.session) redirect("/profile");
  redirect("/login?message=check-email");
}

export async function signOutAction() {
  if (getSupabasePublicConfig()) {
    const supabase = await createClient();
    const result = await safeRequest(() => supabase.auth.signOut());
    if (!result || result.error) redirect("/profile?error=logout");
  }

  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login?next=%2Fprofile");
  if (!getSupabasePublicConfig()) redirect("/profile?error=setup");

  const displayName = getField(formData, "displayName");
  if (!displayName || displayName.length > 80) {
    redirect("/profile?error=invalid-profile");
  }

  const supabase = await createClient();
  const result = await safeRequest(() => supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id)
      .select("id")
      .maybeSingle());

  if (!result || result.error || !result.data) redirect("/profile?error=profile-save");
  revalidatePath("/profile");
  redirect("/profile?message=profile-saved");
}
