import "server-only";

import { getSupabasePublicConfig } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type Mission = {
  id: string;
  title: string;
  description: string;
  mission_type: string;
  activity_type: string;
  target_value: number;
  target_unit: string;
  points: number;
  requires_evidence: boolean;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export type UserMission = {
  id: string;
  mission_id: string;
  user_id: string;
  status: "joined" | "in_progress" | "completed" | "cancelled" | "expired";
  progress_value: number;
  joined_at: string;
  completed_at: string | null;
};

export type MissionActivity = {
  id: string;
  user_mission_id: string;
  activity_type: string;
  value: number;
  unit: string;
  evidence_url: string | null;
  evidence_notes: string | null;
  verification_status: "pending" | "approved" | "rejected";
  reviewer_note: string | null;
  created_at: string;
};

export type PointTransaction = {
  id: string;
  amount: number;
  transaction_type: string;
  source: string;
  description: string;
  created_at: string;
};

export type QueryState<T> =
  | { status: "ready"; data: T }
  | { status: "setup" }
  | { status: "error" };

const missionFields =
  "id,title,description,mission_type,activity_type,target_value,target_unit,points,requires_evidence,status,starts_at,ends_at,created_at";

export async function getAvailableMissions(userId: string | null): Promise<QueryState<Array<Mission & { participation: UserMission | null }>>> {
  if (!getSupabasePublicConfig()) return { status: "setup" };

  try {
    const supabase = await createClient();
    const { data: missionRows, error: missionError } = await supabase
      .from("missions")
      .select(missionFields)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (missionError) return { status: "error" };
    const missions = (missionRows ?? []) as unknown as Mission[];
    const missionIds = missions.map((mission) => mission.id);
    const participationByMission = new Map<string, UserMission>();

    if (userId && missionIds.length > 0) {
      const { data: participationRows, error: participationError } = await supabase
        .from("user_missions")
        .select("id,mission_id,user_id,status,progress_value,joined_at,completed_at")
        .eq("user_id", userId)
        .in("mission_id", missionIds);

      if (participationError) return { status: "error" };
      for (const row of (participationRows ?? []) as unknown as UserMission[]) {
        participationByMission.set(row.mission_id, row);
      }
    }

    return {
      status: "ready",
      data: missions.map((mission) => ({
        ...mission,
        participation: participationByMission.get(mission.id) ?? null,
      })),
    };
  } catch {
    return { status: "error" };
  }
}

export async function getMissionDetail(
  missionId: string,
  userId: string | null,
): Promise<QueryState<{
  mission: Mission;
  participation: UserMission | null;
  activities: MissionActivity[];
} | null>> {
  if (!getSupabasePublicConfig()) return { status: "setup" };

  try {
    const supabase = await createClient();
    const { data: missionRow, error: missionError } = await supabase
      .from("missions")
      .select(missionFields)
      .eq("id", missionId)
      .maybeSingle();

    if (missionError) return { status: "error" };
    if (!missionRow) return { status: "ready", data: null };

    const mission = missionRow as unknown as Mission;
    let participation: UserMission | null = null;
    let activities: MissionActivity[] = [];

    if (userId) {
      const { data: participationRow, error: participationError } = await supabase
        .from("user_missions")
        .select("id,mission_id,user_id,status,progress_value,joined_at,completed_at")
        .eq("mission_id", missionId)
        .eq("user_id", userId)
        .maybeSingle();

      if (participationError) return { status: "error" };
      participation = (participationRow as unknown as UserMission | null) ?? null;

      if (participation) {
        const { data: activityRows, error: activityError } = await supabase
          .from("activities")
          .select("id,user_mission_id,activity_type,value,unit,evidence_url,evidence_notes,verification_status,reviewer_note,created_at")
          .eq("user_mission_id", participation.id)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (activityError) return { status: "error" };
        activities = (activityRows ?? []) as unknown as MissionActivity[];
      }
    }

    return { status: "ready", data: { mission, participation, activities } };
  } catch {
    return { status: "error" };
  }
}

export async function getWalletData(userId: string): Promise<QueryState<{
  balance: number;
  earned: number;
  spent: number;
  transactions: PointTransaction[];
}>> {
  if (!getSupabasePublicConfig()) return { status: "setup" };

  try {
    const supabase = await createClient();
    const [balanceResult, transactionResult] = await Promise.all([
      supabase
        .from("user_point_balances")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("point_transactions")
        .select("id,amount,transaction_type,source,description,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (balanceResult.error || transactionResult.error) return { status: "error" };
    const transactions = (transactionResult.data ?? []) as unknown as PointTransaction[];
    const balanceRow = balanceResult.data as { balance: number | string } | null;

    return {
      status: "ready",
      data: {
        balance: Number(balanceRow?.balance ?? 0),
        earned: transactions.reduce((total, entry) => total + Math.max(0, Number(entry.amount)), 0),
        spent: transactions.reduce((total, entry) => total + Math.max(0, -Number(entry.amount)), 0),
        transactions: transactions.slice(0, 10),
      },
    };
  } catch {
    return { status: "error" };
  }
}

export async function getHistoryData(userId: string): Promise<QueryState<{
  missions: Array<UserMission & { missionTitle: string }>;
  activities: Array<MissionActivity & { missionTitle: string }>;
  transactions: PointTransaction[];
}>> {
  if (!getSupabasePublicConfig()) return { status: "setup" };

  try {
    const supabase = await createClient();
    const [participationResult, activityResult, transactionResult] = await Promise.all([
      supabase
        .from("user_missions")
        .select("id,mission_id,user_id,status,progress_value,joined_at,completed_at")
        .eq("user_id", userId)
        .order("joined_at", { ascending: false })
        .limit(50),
      supabase
        .from("activities")
        .select("id,user_mission_id,activity_type,value,unit,evidence_url,evidence_notes,verification_status,reviewer_note,created_at")
        .eq("user_id", userId)
        .not("user_mission_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("point_transactions")
        .select("id,amount,transaction_type,source,description,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (participationResult.error || activityResult.error || transactionResult.error) {
      return { status: "error" };
    }

    const participations = (participationResult.data ?? []) as unknown as UserMission[];
    const activities = (activityResult.data ?? []) as unknown as MissionActivity[];
    const missionIds = [...new Set(participations.map((item) => item.mission_id))];
    const titleByMission = new Map<string, string>();

    if (missionIds.length > 0) {
      const { data: missionRows, error: missionError } = await supabase
        .from("missions")
        .select("id,title")
        .in("id", missionIds);
      if (missionError) return { status: "error" };
      for (const row of (missionRows ?? []) as Array<{ id: string; title: string }>) {
        titleByMission.set(row.id, row.title);
      }
    }

    const missionIdByParticipation = new Map(
      participations.map((participation) => [participation.id, participation.mission_id]),
    );

    return {
      status: "ready",
      data: {
        missions: participations.map((participation) => ({
          ...participation,
          missionTitle: titleByMission.get(participation.mission_id) ?? "ภารกิจที่ถูกเก็บถาวร",
        })),
        activities: activities.map((activity) => ({
          ...activity,
          missionTitle: titleByMission.get(missionIdByParticipation.get(activity.user_mission_id) ?? "")
            ?? "ภารกิจที่ถูกเก็บถาวร",
        })),
        transactions: (transactionResult.data ?? []) as unknown as PointTransaction[],
      },
    };
  } catch {
    return { status: "error" };
  }
}
