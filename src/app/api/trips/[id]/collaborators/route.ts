import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import { withLogger, getLog } from "@/lib/with-logger";
import { getBaseUrl } from "@/lib/url";

function generateInviteToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

export const GET = withLogger(
  "trips.collaborators.list",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const log = getLog();
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log.warn({ event: "auth.unauthorized" }, "unauthorized collaborators list request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("trip_collaborators")
      .select("id, invited_email, role, accepted_at, invited_at, user_id")
      .eq("trip_id", id);

    return NextResponse.json({ collaborators: data ?? [] });
  }
);

export const POST = withLogger(
  "trips.collaborators.invite",
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const log = getLog();
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log.warn({ event: "auth.unauthorized" }, "unauthorized invite request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("trip_title, destination, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single<{ trip_title: string; destination: string; user_id: string }>();

    if (!trip) return NextResponse.json({ error: "Trip not found or not owner" }, { status: 403 });

    const { email, role = "viewer" } = await request.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const invite_token = generateInviteToken();

    const { error: insertError } = await supabase.from("trip_collaborators").insert({
      trip_id: id,
      invited_email: email.toLowerCase().trim(),
      role,
      invite_token,
    });
    if (insertError) {
      log.error({ err: insertError, tripId: id, event: "db.error" }, "failed to insert invite");
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const inviteUrl = `${getBaseUrl()}/invite/${invite_token}`;

    let emailSent = false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single<{ full_name: string }>();
    const inviterName = profile?.full_name ?? user.email ?? "Someone";

    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
        <tr><td style="background:#0f172a;padding:24px 32px">
          <p style="margin:0;color:#38bdf8;font-size:20px;font-weight:700;letter-spacing:-0.5px">Navoryn</p>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a">You have a trip invite</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6">
            <strong>${inviterName}</strong> has invited you to collaborate on their trip:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:8px;margin-bottom:28px">
            <tr><td style="padding:16px 20px">
              <p style="margin:0;font-size:17px;font-weight:700;color:#0f172a">${trip.trip_title}</p>
              <p style="margin:6px 0 0;font-size:14px;color:#64748b">${trip.destination}</p>
            </td></tr>
          </table>
          <a href="${inviteUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600">
            Accept invite
          </a>
          <p style="margin:28px 0 0;font-size:13px;color:#94a3b8;line-height:1.5">
            If you weren't expecting this invite, you can ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #f1f5f9">
          <p style="margin:0;font-size:12px;color:#94a3b8">Navoryn — AI travel planner</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const emailText = `Hi,\n\n${inviterName} has invited you to collaborate on their trip to ${trip.destination} ("${trip.trip_title}") on Navoryn.\n\nAccept your invite here:\n${inviteUrl}\n\nIf you didn't expect this email, you can ignore it.\n\nNavoryn — AI travel planner`;
    const emailSubject = `${inviterName} invited you to view a trip on Navoryn`;

    // Try Gmail SMTP first (works for any recipient, no domain needed)
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
        });
        await transporter.sendMail({
          from: `"Navoryn" <${process.env.GMAIL_USER}>`,
          to: email,
          subject: emailSubject,
          text: emailText,
          html: emailHtml,
        });
        emailSent = true;
        log.info({ tripId: id, provider: "gmail", event: "email.sent" }, "invite email sent via gmail");
      } catch (e) {
        log.error({ err: e, provider: "gmail", event: "email.failed" }, "gmail invite send failed");
      }
    }

    // Fallback: Resend (only delivers to Resend account owner without a verified domain)
    if (!emailSent && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data: sent, error: emailError } = await resend.emails.send({
        from: "Navoryn <onboarding@resend.dev>",
        to: email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });
      if (emailError) {
        log.error({ err: emailError, provider: "resend", event: "email.failed" }, "resend invite send failed");
      } else if (sent?.id) {
        emailSent = true;
        log.info({ tripId: id, provider: "resend", event: "email.sent" }, "invite email sent via resend");
      }
    }

    return NextResponse.json({ ok: true, invite_token, invite_url: inviteUrl, email_sent: emailSent });
  }
);

export const DELETE = withLogger(
  "trips.collaborators.remove",
  async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const log = getLog();
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      log.warn({ event: "auth.unauthorized" }, "unauthorized collaborator remove request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collaboratorId = searchParams.get("collaboratorId");
    if (!collaboratorId) return NextResponse.json({ error: "Missing collaboratorId" }, { status: 400 });

    await supabase.from("trip_collaborators").delete().eq("id", collaboratorId).eq("trip_id", id);
    log.info({ userId: user.id, tripId: id, collaboratorId, event: "collaborator.removed" }, "collaborator removed");

    return NextResponse.json({ ok: true });
  }
);
