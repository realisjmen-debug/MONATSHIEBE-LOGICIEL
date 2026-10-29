import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function clients() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return null;
  return {
    caller: createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } }),
    admin: createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } }),
  };
}

async function authorize(request: NextRequest) {
  const db = clients();
  if (!db) return { error: "Configuration serveur Supabase manquante.", status: 500 as const };
  const auth = request.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { error: "Authentification requise.", status: 401 as const };
  const { data: userData, error: userError } = await db.caller.auth.getUser(token);
  if (userError || !userData.user) return { error: "Session invalide.", status: 401 as const };
  const { data: platformAdmin, error: adminError } = await db.admin
    .from("platform_admins").select("user_id,active")
    .eq("user_id", userData.user.id).eq("active", true).maybeSingle();
  if (adminError || !platformAdmin) return { error: "Accès réservé au Super Administrateur.", status: 403 as const };
  return { db: db.admin, userId: userData.user.id };
}

export async function GET(request: NextRequest) {
  const auth = await authorize(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { data, error } = await auth.db.from("school_subscriptions")
    .select("id,school_id,plan_id,status,ends_at,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Lecture des abonnements impossible : " + error.message }, { status: 500 });
  return NextResponse.json({ subscriptions: data || [] });
}

export async function POST(request: NextRequest) {
  const auth = await authorize(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    const schoolId = typeof body.school_id === "string" ? body.school_id : "";
    const status = typeof body.status === "string" ? body.status : "";
    const planId = typeof body.plan_id === "string" ? body.plan_id : "";
    const date = body.ends_at === null || body.ends_at === "" ? null : String(body.ends_at);
    const allowed = ["trial", "active", "suspended", "expired", "cancelled"];
    if (!schoolId || !allowed.includes(status) || !planId) return NextResponse.json({ error: "Établissement, plan ou statut invalide." }, { status: 400 });
    const { data: plan, error: planError } = await auth.db.from("subscription_plans").select("id").eq("id", planId).maybeSingle();
    if (planError || !plan) return NextResponse.json({ error: "Le plan sélectionné est introuvable." }, { status: 400 });
    let endsAt: string | null = null;
    if (date !== null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + "T00:00:00Z"))) {
        return NextResponse.json({ error: "La date de fin est invalide." }, { status: 400 });
      }
      endsAt = date + "T23:59:59.999Z";
    }
    const { data: existing, error: lookupError } = await auth.db.from("school_subscriptions")
      .select("id,school_id,status,ends_at,created_at")
      .eq("school_id", schoolId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (lookupError) return NextResponse.json({ error: "Recherche de l’abonnement impossible : " + lookupError.message }, { status: 500 });
    let subscription;
    let error;
    if (!existing) {
      const { data: created, error: createError } = await auth.db.from("school_subscriptions")
        .insert({ school_id: schoolId, plan_id: planId, status, starts_at: new Date().toISOString(), ends_at: endsAt })
        .select("id,school_id,plan_id,status,ends_at,created_at").single();
      subscription = created;
      error = createError;
    } else {
      const { data: updated, error: updateError } = await auth.db.from("school_subscriptions")
        .update({ plan_id: planId, status, ends_at: endsAt }).eq("id", existing.id)
        .select("id,school_id,plan_id,status,ends_at,created_at").single();
      subscription = updated;
      error = updateError;
    }
    if (error || !subscription) return NextResponse.json({ error: "Enregistrement de l’abonnement impossible : " + (error?.message || "aucune ligne mise à jour") }, { status: 500 });
    return NextResponse.json({ subscription });
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
}
