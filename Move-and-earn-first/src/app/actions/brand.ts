"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
export async function saveBrandItemAction(form:FormData) {
 await requireRole("brand", "/brand");
 const db=await createClient(); const kind=String(form.get("kind"));
 const title=String(form.get("title")??"").trim(); const description=String(form.get("description")??"").trim();
 if(title.length<2 || title.length>160 || description.length<2 || description.length>2000) redirect("/brand?error=input");
 let error;
 if(kind==="campaign") ({error}=await db.from("campaigns").insert({brand_id:String(form.get("brandId")),name:title,objective:description}));
 else if(kind==="challenge") {
 const target=Number(form.get("target"));const points=Number(form.get("points"));
 if(!Number.isFinite(target)||target<=0||!Number.isInteger(points)||points<=0) redirect("/brand?error=input");
 ({error}=await db.from("challenges").insert({brand_id:String(form.get("brandId")),campaign_id:String(form.get("campaignId")),title,description,objective:description,activity_type:"walk",target_unit:"km",target_value:target,reward_points:points}));
 } else redirect("/brand?error=input");
 revalidatePath("/brand");revalidatePath("/brand/campaigns");revalidatePath("/brand/challenges");
 redirect(error?"/brand?error=save":"/brand?success=1");
}
export async function activateBrandItemAction(form:FormData) {
 await requireRole("brand", "/brand");const db=await createClient();
 const kind=String(form.get("kind"));if(!["campaigns","challenges"].includes(kind)) redirect("/brand?error=input");
 const status=String(form.get("status")??"active");
 if(!["active","paused"].includes(status)) redirect("/brand?error=input");
 const {error}=await db.from(kind).update({status}).eq("id",String(form.get("id"))).select("id").single();
 revalidatePath("/brand");revalidatePath("/challenges");
 redirect(error?"/brand?error=activate":"/brand?success=1");
}
export async function reviewBrandActivityAction(form:FormData) {
 await requireRole("brand", "/brand");const db=await createClient();
 const approved=String(form.get("approved"));if(!["true","false"].includes(approved)) redirect("/brand?error=input");
 const {error}=await db.rpc("review_activity",{p_activity_id:String(form.get("id")),p_approved:approved==="true"});
 revalidatePath("/brand");revalidatePath("/wallet");revalidatePath("/challenges");
 redirect(error?"/brand?error=review":"/brand?success=1");
}

export async function editBrandItemAction(form: FormData) {
 await requireRole("brand", "/brand");
 const kind=String(form.get("kind"));
 const id=String(form.get("id"));
 const title=String(form.get("title")??"").trim();
 const description=String(form.get("description")??"").trim();
 if(!["campaigns","challenges"].includes(kind)||title.length<2||title.length>160||description.length<2||description.length>2000) redirect("/brand?error=input");
 const db=await createClient();
 // RLS checks active owner/manager membership on the existing row.
 const changes=kind==="campaigns"?{name:title,objective:description}:{title,description,objective:description};
 const {error}=await db.from(kind).update(changes).eq("id",id).select("id").single();
 for(const path of ["/brand","/brand/campaigns","/brand/challenges","/brand/analytics","/challenges"]) revalidatePath(path);
 redirect(error?"/brand?error=save":"/brand?success=1");
}
