import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicConfig } from "@/lib/env";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { challengeAction } from "@/app/actions/challenges";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
export default async function ChallengesPage({searchParams}:{searchParams:Promise<{error?:string;success?:string}>}) {
 const params=await searchParams;
 if(!getSupabasePublicConfig()) return <main className="p-8">กรุณาตั้งค่า Supabase เพื่อดู Challenges</main>;
 const db=await createClient();const user=await getAuthenticatedUser();
 const {data,error}=await db.from("challenges").select("id,title,description,target_value,target_unit,reward_points").eq("status","active");
 const {data:joined,error:joinError}=user?await db.from("challenge_participants").select("id,challenge_id,status,progress_value").eq("user_id",user.id):{data:[],error:null};
 return <main className="mx-auto max-w-5xl space-y-6 p-6"><h1 className="text-3xl font-bold">Challenges</h1>{params.error&&<p role="alert">ทำรายการไม่สำเร็จ ตรวจข้อมูลหรือรายการที่รอตรวจ แล้วลองใหม่</p>}{params.success&&<p role="status">บันทึกสำเร็จ</p>}{(error||joinError)&&<p role="alert">โหลดข้อมูลไม่สำเร็จ</p>}{data?.map(c=>{const participation=joined?.find(j=>j.challenge_id===c.id);return <article key={c.id} className="space-y-3 rounded-xl border bg-white p-5"><h2 className="text-xl font-bold">{c.title}</h2><p>{c.description}</p><p>เป้าหมาย {c.target_value} {c.target_unit} · {c.reward_points} แต้ม</p>{!participation?<form action={challengeAction}><input type="hidden" name="operation" value="join"/><input type="hidden" name="id" value={c.id}/><PendingSubmitButton pendingLabel="กำลังเข้าร่วม">เข้าร่วม</PendingSubmitButton></form>:<><p>{participation.status} · {participation.progress_value}/{c.target_value}</p>{["joined","in_progress"].includes(participation.status)&&<form action={challengeAction} className="flex flex-wrap gap-3"><input type="hidden" name="operation" value="submit"/><input type="hidden" name="id" value={participation.id}/><input aria-label="จำนวนกิจกรรม" name="value" type="number" min="0.001" step="0.001" max={Number(c.target_value)-Number(participation.progress_value)} required/><input aria-label="หลักฐานและรายละเอียด" name="notes" maxLength={2000} placeholder="หลักฐาน / รายละเอียด"/><PendingSubmitButton pendingLabel="กำลังส่ง">ส่งให้แบรนด์ตรวจ</PendingSubmitButton></form>}</>}</article>})}{!error&&!data?.length&&<p>ยังไม่มี Challenge ที่เปิดอยู่</p>}</main>;
}
