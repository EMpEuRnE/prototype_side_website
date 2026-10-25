import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, Clock3, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/core/progress-bar";
import type { Mission, UserMission } from "@/lib/missions/data";

const numbers = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 3 });
const statusLabels: Record<UserMission["status"], string> = {
  joined: "เริ่มแล้ว",
  in_progress: "กำลังทำ",
  completed: "สำเร็จแล้ว",
  cancelled: "ยกเลิกแล้ว",
  expired: "หมดเวลา",
};

export function MissionCard({ mission, participation }: { mission: Mission; participation: UserMission | null }) {
  const StatusIcon = participation?.status === "completed" ? CheckCircle2 : participation ? Clock3 : CircleDashed;

  return (
    <Card className="flex h-full flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-50 px-3 py-1.5 text-xs font-semibold text-emerald-900">
          <StatusIcon size={14} aria-hidden="true" />
          {participation ? statusLabels[participation.status] : `รับ ${numbers.format(mission.points)} แต้ม`}
        </span>
      </div>
      <h2 className="mt-5 text-xl font-semibold text-slate-950">{mission.title}</h2>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{mission.description}</p>
      <div className="mt-5 space-y-4">
        {participation ? (
          <ProgressBar value={Number(participation.progress_value)} target={Number(mission.target_value)} unit={mission.target_unit} />
        ) : (
          <p className="text-sm text-slate-600">เป้าหมาย {numbers.format(Number(mission.target_value))} {mission.target_unit}</p>
        )}
        <Link
          href={`/missions/${mission.id}`}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          {participation ? "ดูภารกิจและส่งกิจกรรม" : "ดูรายละเอียดภารกิจ"}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}
