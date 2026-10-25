import Link from "next/link";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/env";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { redeemRewardAction } from "@/app/actions/rewards";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
export default async function RewardsPage({searchParams}: {searchParams:Promise<{error?:string;success?:string}>}) {
 const params = await searchParams;
 if (!getSupabasePublicConfig()) return <main className="p-8">กรุณาตั้งค่า Supabase เพื่อดูรางวัล</main>;
 const db=await createClient(); const user=await getAuthenticatedUser();
 const {data:rewards,error}=await db.from("rewards").select("id,title,description,category,points_required,stock").eq("status","active");
 const {data:claims,error:claimError}=user ? await db.from("redemptions").select("id,redemption_code,status,points_spent").eq("user_id",user.id).order("created_at",{ascending:false}) : {data:[],error:null};
 return <main className="mx-auto max-w-5xl space-y-6 p-6"><h1 className="text-3xl font-bold">รางวัล</h1><p>แต้มใช้แลกรางวัลภายในแพลตฟอร์ม ไม่ใช่เงินสด และไม่มีอัตรา 1 แต้ม = 1 บาท รางวัลทั้งหมดในเดโมเป็นตัวอย่าง</p>
 {params.error && <p role="alert">แลกรางวัลไม่สำเร็จ โปรดตรวจแต้ม สต็อก และลองใหม่</p>}{params.success && <p role="status">แลกรางวัลสำเร็จ แสดงรหัสด้านล่างให้แบรนด์</p>}
 {(error || claimError) && <p role="alert">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p>}
 <div className="grid gap-4 md:grid-cols-2">{rewards?.map(r=><article className="rounded-2xl border bg-white p-5" key={r.id}><h2 className="text-xl font-bold"><Link href={`/rewards/${r.id}`}>{r.title}</Link></h2><p className="text-sm text-emerald-700">{r.category}</p><p>{r.description}</p><p>{r.points_required} แต้ม · คงเหลือ {r.stock ?? "ไม่จำกัด"}</p><form action={redeemRewardAction}><input type="hidden" name="rewardId" value={r.id}/><input type="hidden" name="requestId" value={randomUUID()}/><PendingSubmitButton pendingLabel="กำลังแลก…" disabled={r.stock===0}>แลกรางวัล</PendingSubmitButton></form></article>)}</div>
 {!error && !rewards?.length && <p>ยังไม่มีรางวัลพร้อมแลก</p>}
 <h2 className="text-xl font-bold">รางวัลของฉัน</h2>{!claimError&&!claims?.length&&<p>ยังไม่มีประวัติการแลกรางวัล</p>}{claims?.map(r=><article key={r.id} className="rounded-xl border p-4"><p>รหัส: <strong>{r.redemption_code}</strong></p><p>{r.status} · {r.points_spent} แต้ม</p></article>)}
 </main>;
}
