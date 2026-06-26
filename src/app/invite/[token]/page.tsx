import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Accept invite — Navoryn" };

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const supabase = await createClient();

  // Use SECURITY DEFINER function — bypasses RLS so anonymous visitors can look up the token
  type InviteRow = { id: string; trip_id: string; invited_email: string; role: string; accepted_at: string | null };
  const { data: invites } = await supabase
    .rpc("get_invite_by_token", { p_token: token }) as { data: InviteRow[] | null };

  const invite: InviteRow | null = Array.isArray(invites) ? (invites[0] ?? null) : null;

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-navy p-4">
        <div className="max-w-sm text-center">
          <p className="text-5xl mb-4">🔗</p>
          <h1 className="text-xl font-bold text-white mb-2">Invalid invite link</h1>
          <p className="text-slate-400 text-sm mb-6">This invite link doesn&apos;t exist or has expired.</p>
          <Link href="/" className="text-sky hover:underline text-sm">Go to Navoryn →</Link>
        </div>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();

  // Not logged in → redirect to signup with return URL
  if (!user) {
    redirect(`/auth/signup?redirect=${encodeURIComponent(`/invite/${token}`)}`);
  }

  // Already accepted → go straight to the trip
  if (invite.accepted_at) {
    redirect(`/trips/${invite.trip_id}`);
  }

  // Accept via SECURITY DEFINER function — bypasses RLS for the update too
  await supabase.rpc("accept_invite", { p_token: token });

  redirect(`/trips/${invite.trip_id}`);
}
