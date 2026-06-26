import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/types/budget";
import { withLogger, getLog } from "@/lib/with-logger";

const MAX_EXPENSE_AMOUNT = 1_000_000_000; // 1 billion — rejects NaN and absurd values

export const GET = withLogger(
  "trips.expenses.get",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const log = getLog();
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log.warn({ event: "auth.unauthorized" }, "unauthorized expenses request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("trip_expenses")
      .select("*")
      .eq("trip_id", id)
      .eq("user_id", user.id)
      .order("expense_date", { ascending: true })
      .order("created_at", { ascending: true })
      .returns<Expense[]>();

    if (error) {
      log.error({ err: error, tripId: id, event: "db.error" }, "failed to fetch expenses");
      return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
    }
    return NextResponse.json({ expenses: data ?? [] });
  }
);

export const POST = withLogger(
  "trips.expenses.create",
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const log = getLog();
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log.warn({ event: "auth.unauthorized" }, "unauthorized expense create request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, amount, currency, category, expense_date, notes } = body;

    if (!name || amount == null || !category || !expense_date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (!isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > MAX_EXPENSE_AMOUNT) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("trip_expenses")
      .insert({
        trip_id: id,
        user_id: user.id,
        name,
        amount: parsedAmount,
        currency: currency ?? "USD",
        category,
        expense_date,
        notes: notes ?? null,
      })
      .select()
      .single<Expense>();

    if (error) {
      log.error({ err: error, tripId: id, event: "db.error" }, "failed to create expense");
      return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
    }
    return NextResponse.json({ expense: data }, { status: 201 });
  }
);

export const DELETE = withLogger(
  "trips.expenses.delete",
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const log = getLog();
    const { id: tripId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log.warn({ event: "auth.unauthorized" }, "unauthorized expense delete request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get("expenseId");
    if (!expenseId) return NextResponse.json({ error: "Missing expenseId" }, { status: 400 });

    const { error } = await supabase
      .from("trip_expenses")
      .delete()
      .eq("id", expenseId)
      .eq("trip_id", tripId)
      .eq("user_id", user.id);

    if (error) {
      log.error({ err: error, tripId, expenseId, event: "db.error" }, "failed to delete expense");
      return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }
);
