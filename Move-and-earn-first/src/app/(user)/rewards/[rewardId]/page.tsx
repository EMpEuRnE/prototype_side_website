import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/env";
import { redeemRewardAction } from "@/app/actions/rewards";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";

async function requestTime() { return Date.now(); }

export default async function RewardDetail({params}:{params:Promise<{rewardId:string}>}) {
 const {rewardId}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rewardId)) notFound();
 if(!getSupabasePublicConfig()) return <main className="p-6">กรุณาตั้งค่า Supabase เพื่อดูรางวัล</main>;
 const db=await createClient();
 const {data:reward,error}=await db.from("rewards").select("id,title,description,category,points_required,stock,status,expires_at").eq("id",rewardId).maybeSingle();
 if(error) return <main className="p-6" role="alert">โหลดรางวัลไม่สำเร็จ กรุณาลองใหม่</main>;
 if(!reward) notFound();
 const now=await requestTime();
 const unavailable=reward.status!=="active"||reward.stock===0||!!(reward.expires_at&&new Date(reward.expires_at).getTime()<=now);
 return <main className="mx-auto max-w-2xl space-y-6 p-6"><Link href="/rewards" className="text-emerald-800">← กลับหน้ารางวัล</Link><article className="space-y-4 rounded-3xl border bg-white p-6"><p className="text-sm text-emerald-700">{reward.category}</p><h1 className="text-3xl font-bold">{reward.title}</h1><p>{reward.description}</p><p className="text-xl font-bold">{reward.points_required} แต้ม</p><p>คงเหลือ {reward.stock??"ไม่จำกัด"} · {reward.status}</p>{reward.expires_at&&<p>ใช้ได้ถึง {new Date(reward.expires_at).toLocaleDateString("th-TH")}</p>}<p>รางวัลตัวอย่างสำหรับเดโม ไม่มีการชำระเงินหรือส่งมอบรางวัลจริง แต้มไม่มีอัตราแลกเป็นเงินสด</p><form action={redeemRewardAction}><input type="hidden" name="rewardId" value={reward.id}/><input type="hidden" name="requestId" value={randomUUID()}/><PendingSubmitButton disabled={unavailable} pendingLabel="กำลังแลก…">{unavailable?"ยังไม่พร้อมแลก":"ยืนยันแลกรางวัล"}</PendingSubmitButton></form></article></main>;
}
