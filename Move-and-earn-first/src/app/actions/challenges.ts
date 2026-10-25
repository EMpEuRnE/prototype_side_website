"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
export async function challengeAction(form:FormData) {
 await requireAuthenticatedUser("/challenges");const db=await createClient();
 let failed: boolean;
 try {
 if(form.get("operation")==="join") { const {error}=await db.rpc("join_challenge",{p_challenge_id:String(form.get("id"))});failed=!!error; }
 else {const value=Number(form.get("value"));if(!Number.isFinite(value)||value<=0) redirect("/challenges?error=input");const {error}=await db.rpc("submit_challenge_activity",{p_participant_id:String(form.get("id")),p_value:value,p_evidence_notes:String(form.get("notes")??"")});failed=!!error;}
 }catch {failed=true;}
 revalidatePath("/challenges");revalidatePath("/brand");
 redirect(failed?"/challenges?error=operation":"/challenges?success=1");
}
