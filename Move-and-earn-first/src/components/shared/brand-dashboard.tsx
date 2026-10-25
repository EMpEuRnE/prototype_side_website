import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/guards";
import { saveBrandItemAction, activateBrandItemAction, reviewBrandActivityAction, editBrandItemAction } from "@/app/actions/brand";
import { manageRedemptionAction } from "@/app/actions/rewards";
import { PendingSubmitButton } from "@/components/ui/pending-submit-button";
export async function BrandDashboard({searchParams}:{searchParams?:Promise<{error?:string;success?:string}>}) {
 const params=await searchParams;
 const user=await requireRole("brand","/brand");const db=await createClient();
 const members=await db.from("brand_memberships").select("brand_id,membership_role").eq("profile_id",user.id).eq("status","active");
 const brandIds=members.data?.map(m=>m.brand_id)??[];
 if(members.error) return <main className="p-6" role="alert">โหลดสิทธิ์แบรนด์ไม่สำเร็จ กรุณาลองใหม่</main>;
 if(!brandIds.length) return <main className="p-6">บัญชีนี้ยังไม่ได้รับสิทธิ์สมาชิกแบรนด์ กรุณาติดต่อผู้ดูแลเดโม</main>;
 const results=await Promise.all([
 db.from("campaigns").select("id,name,brand_id,status,objective").in("brand_id",brandIds),db.from("challenges").select("id,title,status,brand_id,description").in("brand_id",brandIds),
 db.from("activities").select("id,value,unit,evidence_notes,challenge_participant_id").eq("verification_status","pending").not("challenge_participant_id","is",null),
 db.from("redemptions").select("id,redemption_code,status,reward_id"),db.from("campaign_results").select("campaign_id,campaign_name,participant_count,completion_count,points_awarded,activity_count")]);
 const [campaigns,challenges,activities,redemptions,analytics]=results;
 const challengeIds=challenges.data?.map(c=>c.id)??[];
 const participants=challengeIds.length?await db.from("challenge_participants").select("id,challenge_id,status,progress_value,completed_at").in("challenge_id",challengeIds).order("joined_at",{ascending:false}):{data:[],error:null};
 const managers=members.data?.filter(m=>["owner","manager"].includes(m.membership_role))??[];
 const rewardIds=[...new Set(redemptions.data?.map(r=>r.reward_id)??[])];
 const {data:ownedRewards}=rewardIds.length?await db.from("rewards").select("id,brand_id").in("id",rewardIds).in("brand_id",managers.map(m=>m.brand_id)):{data:[]};
 const allowed=new Set(ownedRewards?.map(r=>r.id));
 return <main className="mx-auto max-w-5xl space-y-6 p-6"><h1 className="text-3xl font-bold">จัดการแบรนด์</h1>
 {params?.error&&<p role="alert">ทำรายการไม่สำเร็จ โปรดตรวจข้อมูลและสิทธิ์แล้วลองใหม่</p>}{params?.success&&<p role="status">บันทึกสำเร็จ</p>}
 <p>รายการที่บันทึกจะเป็น Draft กดเปิดใช้งานเพื่อเผยแพร่</p>{results.some(r=>r.error)&&<p role="alert">โหลดข้อมูลบางส่วนไม่สำเร็จ</p>}
 {!members.data?.length&&<p>บัญชีนี้ยังไม่ได้รับสิทธิ์สมาชิกแบรนด์</p>}
 {managers.map(m=><section key={m.brand_id} className="space-y-4 rounded-xl border p-4"><h2>สร้างแคมเปญ / Walking Challenge</h2>{["campaign","challenge"].map(kind=><form key={kind} action={saveBrandItemAction} className="flex flex-wrap gap-3"><input type="hidden" name="kind" value={kind}/><input type="hidden" name="brandId" value={m.brand_id}/><input aria-label="ชื่อ" name="title" placeholder={kind==="campaign"?"ชื่อแคมเปญ":"ชื่อ Challenge"} required minLength={2} maxLength={160}/><input aria-label="รายละเอียด" name="description" placeholder="รายละเอียด / เป้าหมาย" required minLength={2} maxLength={2000}/>{kind==="challenge"&&<><select aria-label="แคมเปญ" name="campaignId" required>{campaigns.data?.filter(c=>c.brand_id===m.brand_id).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><input aria-label="ระยะทางกิโลเมตร" name="target" type="number" min="0.001" step="0.001" required placeholder="กิโลเมตร"/><input aria-label="แต้ม" name="points" type="number" min="1" required placeholder="แต้ม"/></>}<PendingSubmitButton pendingLabel="กำลังบันทึก">สร้าง {kind}</PendingSubmitButton></form>)}</section>)}
 <h2 className="text-xl font-bold">แคมเปญและ Challenges</h2>{[...(campaigns.data??[]).map(c=>({...c,title:c.name,description:c.objective,kind:"campaigns"})),...(challenges.data??[]).map(c=>({...c,kind:"challenges"}))].map(c=><article key={c.id} className="rounded-xl border p-4"><p>{c.title} · {c.status}</p>{managers.some(m=>m.brand_id===c.brand_id)&&!["completed","archived","cancelled"].includes(c.status)&&<form action={activateBrandItemAction}><input type="hidden" name="kind" value={c.kind}/><input type="hidden" name="id" value={c.id}/><input type="hidden" name="status" value={c.status==="active"?"paused":"active"}/><PendingSubmitButton pendingLabel="กำลังบันทึก…">{c.status==="active"?"หยุดเผยแพร่":"เปิดใช้งาน"}</PendingSubmitButton></form>}
 {managers.some(m=>m.brand_id===c.brand_id)&&<details className="mt-3"><summary className="cursor-pointer">แก้ไขรายละเอียด</summary><form action={editBrandItemAction} className="mt-3 grid gap-3"><input type="hidden" name="id" value={c.id}/><input type="hidden" name="kind" value={c.kind}/><label>ชื่อ<input name="title" defaultValue={c.title} required minLength={2} maxLength={160}/></label><label>รายละเอียด<textarea name="description" defaultValue={c.description} required minLength={2} maxLength={2000}/></label><PendingSubmitButton pendingLabel="กำลังบันทึก…">บันทึก</PendingSubmitButton></form></details>}
 </article>)}
 <h2 className="text-xl font-bold">ผู้เข้าร่วม Challenges</h2>
 {participants.error&&<p role="alert">โหลดผู้เข้าร่วมไม่สำเร็จ</p>}
 {!participants.error&&!participants.data?.length&&<p>ยังไม่มีผู้เข้าร่วม เผยแพร่ Challenge แล้วให้ผู้ใช้เข้าร่วมเพื่อเริ่มเดโม</p>}
 {participants.data?.map(p=><article key={p.id} className="rounded-xl border bg-white p-4"><p>{challenges.data?.find(c=>c.id===p.challenge_id)?.title}</p><p>ผู้เข้าร่วม #{p.id.slice(0,8)} · {p.status} · ความคืบหน้า {p.progress_value}</p>{p.completed_at&&<p>สำเร็จเมื่อ {new Date(p.completed_at).toLocaleDateString("th-TH")}</p>}</article>)}
 <h2 className="text-xl font-bold">ตรวจหลักฐาน</h2>{activities.data?.map(a=><article key={a.id} className="rounded-xl border p-4"><p>{a.value} {a.unit} · {a.evidence_notes}</p><form action={reviewBrandActivityAction}><input type="hidden" name="id" value={a.id}/><button name="approved" value="true">อนุมัติ</button> <button name="approved" value="false">ปฏิเสธ</button></form></article>)}
 <h2 className="text-xl font-bold">ส่งมอบรางวัล</h2>{redemptions.data?.filter(r=>allowed.has(r.reward_id)).map(r=><article key={r.id} className="rounded-xl border p-4"><p>{r.redemption_code} · {r.status}</p>{r.status==="requested"&&<form action={manageRedemptionAction}><input type="hidden" name="redemptionId" value={r.id}/><button name="operation" value="fulfill_redemption">ยืนยันส่งมอบ</button> <button name="operation" value="refund_redemption">ยกเลิกและคืนแต้ม</button></form>}</article>)}
 <h2 className="text-xl font-bold">ผลลัพธ์แคมเปญ</h2>{analytics.data?.map(a=><p key={a.campaign_id}>{a.campaign_name}: เข้าร่วม {a.participant_count} · สำเร็จ {a.completion_count} · อัตราสำเร็จ {Number(a.participant_count)?Math.round(Number(a.completion_count)/Number(a.participant_count)*100):0}% · กิจกรรม {a.activity_count} · แต้มที่แจก {a.points_awarded}</p>)}
 </main>;
}
