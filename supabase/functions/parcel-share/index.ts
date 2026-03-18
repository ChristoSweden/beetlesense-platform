/**
 * parcel-share  —  Manage parcel sharing & collaboration.
 *
 * POST   /parcel-share  — Create share invitation
 * GET    /parcel-share?parcel_id=<uuid>  — List collaborators
 * PATCH  /parcel-share  — Update collaborator role
 * DELETE /parcel-share  — Remove collaborator
 *
 * Body (POST):
 *   { parcel_id: string, email: string, role: "viewer"|"commenter"|"editor"|"admin" }
 *
 * Body (PATCH):
 *   { share_id: string, role: "viewer"|"commenter"|"editor"|"admin" }
 *
 * Body (DELETE):
 *   { share_id: string }
 *
 * Query (GET):
 *   ?parcel_id=<uuid>
 *   ?shared_with_me=true  — List parcels shared with the calling user
 *   ?token=<share_token>  — Accept a share link
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, created, err } from "../_shared/response.ts";

const VALID_ROLES = ["viewer", "commenter", "editor", "admin"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  try {
    const user = await getUser(req);
    const supabase = createServiceClient();
    const url = new URL(req.url);

    // ── GET: List collaborators or shared-with-me ─────────────────────
    if (req.method === "GET") {
      // Accept a share link by token
      const token = url.searchParams.get("token");
      if (token) {
        return await acceptShareLink(supabase, user, token);
      }

      // List parcels shared with me
      const sharedWithMe = url.searchParams.get("shared_with_me");
      if (sharedWithMe === "true") {
        return await listSharedWithMe(supabase, user);
      }

      // List collaborators for a specific parcel
      const parcelId = url.searchParams.get("parcel_id");
      if (!parcelId) {
        return err("parcel_id query parameter is required");
      }

      // Verify the user has access to this parcel (owner or admin)
      const hasAccess = await verifyParcelAccess(supabase, user.id, parcelId);
      if (!hasAccess) {
        return err("You do not have permission to view collaborators for this parcel", 403);
      }

      const { data: shares, error: listErr } = await supabase
        .from("parcel_shares")
        .select(`
          id,
          parcel_id,
          user_id,
          invited_email,
          role,
          status,
          invited_by,
          expires_at,
          created_at,
          updated_at
        `)
        .eq("parcel_id", parcelId)
        .order("created_at", { ascending: false });

      if (listErr) {
        console.error("List shares error:", listErr);
        return err("Failed to list collaborators", 500);
      }

      // Enrich with profile data for accepted shares
      const userIds = (shares ?? [])
        .filter((s: Record<string, unknown>) => s.user_id)
        .map((s: Record<string, unknown>) => s.user_id);

      let profiles: Record<string, unknown>[] = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .in("id", userIds);
        profiles = profileData ?? [];
      }

      const profileMap = new Map(
        profiles.map((p: Record<string, unknown>) => [p.id, p])
      );

      // Get parcel owner info
      const { data: parcel } = await supabase
        .from("parcels")
        .select("created_by")
        .eq("id", parcelId)
        .single();

      let ownerProfile = null;
      if (parcel?.created_by) {
        const { data: op } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, email")
          .eq("id", parcel.created_by)
          .single();
        ownerProfile = op;
      }

      const enrichedShares = (shares ?? []).map((s: Record<string, unknown>) => ({
        ...s,
        profile: s.user_id ? profileMap.get(s.user_id as string) ?? null : null,
      }));

      return ok({
        collaborators: enrichedShares,
        owner: ownerProfile,
      });
    }

    // ── POST: Create share invitation ─────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body) return err("Invalid JSON body");

      // Generate share link
      if (body.generate_link) {
        return await generateShareLink(supabase, user, body);
      }

      const { parcel_id, email, role } = body as {
        parcel_id?: string;
        email?: string;
        role?: string;
      };

      if (!parcel_id || typeof parcel_id !== "string") {
        return err("parcel_id is required");
      }
      if (!email || typeof email !== "string") {
        return err("email is required");
      }
      if (!role || !VALID_ROLES.includes(role)) {
        return err(`role must be one of: ${VALID_ROLES.join(", ")}`);
      }

      // Verify the user has admin/owner access
      const hasAccess = await verifyParcelAccess(supabase, user.id, parcel_id);
      if (!hasAccess) {
        return err("You do not have permission to share this parcel", 403);
      }

      // Don't allow sharing with yourself
      if (email.toLowerCase() === user.email.toLowerCase()) {
        return err("You cannot share a parcel with yourself");
      }

      // Check for existing share
      const { data: existing } = await supabase
        .from("parcel_shares")
        .select("id, status")
        .eq("parcel_id", parcel_id)
        .eq("invited_email", email.toLowerCase())
        .maybeSingle();

      if (existing) {
        return err("This person already has access or a pending invitation", 409);
      }

      // Look up if the invited email belongs to an existing user
      const { data: invitedUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      const { data: share, error: insertErr } = await supabase
        .from("parcel_shares")
        .insert({
          parcel_id,
          user_id: invitedUser?.id ?? null,
          invited_email: email.toLowerCase(),
          role,
          status: invitedUser ? "accepted" : "pending",
          invited_by: user.id,
          accepted_at: invitedUser ? new Date().toISOString() : null,
        })
        .select("id, parcel_id, invited_email, role, status, created_at")
        .single();

      if (insertErr) {
        console.error("Insert share error:", insertErr);
        return err("Failed to create share invitation", 500);
      }

      // If the user exists, we could send a notification.
      // If they don't exist, send an email invitation via Supabase.
      if (!invitedUser) {
        try {
          // Use Supabase Auth to send an invite email
          await supabase.auth.admin.inviteUserByEmail(email.toLowerCase(), {
            data: {
              invited_to_parcel: parcel_id,
              share_id: share.id,
            },
          });
        } catch (emailErr) {
          console.warn("Failed to send invitation email:", emailErr);
          // Non-fatal — the share record is still created
        }
      }

      return created(share);
    }

    // ── PATCH: Update collaborator role ───────────────────────────────
    if (req.method === "PATCH") {
      const body = await req.json().catch(() => null);
      if (!body) return err("Invalid JSON body");

      const { share_id, role } = body as {
        share_id?: string;
        role?: string;
      };

      if (!share_id) return err("share_id is required");
      if (!role || !VALID_ROLES.includes(role)) {
        return err(`role must be one of: ${VALID_ROLES.join(", ")}`);
      }

      // Fetch the share to check parcel ownership
      const { data: share } = await supabase
        .from("parcel_shares")
        .select("id, parcel_id")
        .eq("id", share_id)
        .single();

      if (!share) return err("Share not found", 404);

      const hasAccess = await verifyParcelAccess(supabase, user.id, share.parcel_id);
      if (!hasAccess) {
        return err("You do not have permission to modify this share", 403);
      }

      const { data: updated, error: updateErr } = await supabase
        .from("parcel_shares")
        .update({ role })
        .eq("id", share_id)
        .select("id, role, updated_at")
        .single();

      if (updateErr) {
        console.error("Update share error:", updateErr);
        return err("Failed to update collaborator role", 500);
      }

      return ok(updated);
    }

    // ── DELETE: Remove collaborator ───────────────────────────────────
    if (req.method === "DELETE") {
      const body = await req.json().catch(() => null);
      if (!body) return err("Invalid JSON body");

      const { share_id } = body as { share_id?: string };
      if (!share_id) return err("share_id is required");

      // Fetch the share
      const { data: share } = await supabase
        .from("parcel_shares")
        .select("id, parcel_id, user_id")
        .eq("id", share_id)
        .single();

      if (!share) return err("Share not found", 404);

      // Allow owner/admin to remove, or user to remove themselves
      const hasAccess = await verifyParcelAccess(supabase, user.id, share.parcel_id);
      const isSelf = share.user_id === user.id;

      if (!hasAccess && !isSelf) {
        return err("You do not have permission to remove this collaborator", 403);
      }

      const { error: deleteErr } = await supabase
        .from("parcel_shares")
        .delete()
        .eq("id", share_id);

      if (deleteErr) {
        console.error("Delete share error:", deleteErr);
        return err("Failed to remove collaborator", 500);
      }

      return ok({ deleted: true });
    }

    return err("Method not allowed", 405);
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("parcel-share error:", e);
    return err(message, status);
  }
});

// ── Helper: Verify parcel access (owner or admin collaborator) ──────
async function verifyParcelAccess(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  parcelId: string,
): Promise<boolean> {
  // Check if user is the parcel owner
  const { data: parcel } = await supabase
    .from("parcels")
    .select("id")
    .eq("id", parcelId)
    .eq("created_by", userId)
    .maybeSingle();

  if (parcel) return true;

  // Check if user is an admin collaborator
  const { data: adminShare } = await supabase
    .from("parcel_shares")
    .select("id")
    .eq("parcel_id", parcelId)
    .eq("user_id", userId)
    .eq("role", "admin")
    .eq("status", "accepted")
    .maybeSingle();

  return !!adminShare;
}

// ── Helper: List parcels shared with the current user ────────────────
async function listSharedWithMe(
  supabase: ReturnType<typeof createServiceClient>,
  user: { id: string; email: string },
): Promise<Response> {
  // Find shares where the user is a collaborator (by user_id or email)
  const { data: shares, error: listErr } = await supabase
    .from("parcel_shares")
    .select("id, parcel_id, role, status, invited_by, created_at")
    .or(`user_id.eq.${user.id},invited_email.eq.${user.email.toLowerCase()}`)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (listErr) {
    console.error("List shared with me error:", listErr);
    return err("Failed to fetch shared parcels", 500);
  }

  if (!shares || shares.length === 0) {
    return ok([]);
  }

  // Fetch parcel details
  const parcelIds = [...new Set(shares.map((s: Record<string, unknown>) => s.parcel_id))];
  const { data: parcels } = await supabase
    .from("parcels")
    .select("id, name, area_ha, status, municipality")
    .in("id", parcelIds);

  const parcelMap = new Map(
    (parcels ?? []).map((p: Record<string, unknown>) => [p.id, p])
  );

  // Fetch inviter profiles
  const inviterIds = [...new Set(shares.map((s: Record<string, unknown>) => s.invited_by))];
  const { data: inviterProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", inviterIds);

  const inviterMap = new Map(
    (inviterProfiles ?? []).map((p: Record<string, unknown>) => [p.id, p])
  );

  const enriched = shares.map((s: Record<string, unknown>) => ({
    ...s,
    parcel: parcelMap.get(s.parcel_id as string) ?? null,
    invited_by_profile: inviterMap.get(s.invited_by as string) ?? null,
  }));

  return ok(enriched);
}

// ── Helper: Generate share link ──────────────────────────────────────
async function generateShareLink(
  supabase: ReturnType<typeof createServiceClient>,
  user: { id: string; email: string },
  body: Record<string, unknown>,
): Promise<Response> {
  const { parcel_id, expires_in, password } = body as {
    parcel_id?: string;
    expires_in?: string; // "24h", "7d", "30d", "permanent"
    password?: string;
  };

  if (!parcel_id) return err("parcel_id is required");

  const hasAccess = await verifyParcelAccess(supabase, user.id, parcel_id);
  if (!hasAccess) {
    return err("You do not have permission to generate a share link", 403);
  }

  // Generate a cryptographic token
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const shareToken = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Calculate expiration
  let expiresAt: string | null = null;
  if (expires_in && expires_in !== "permanent") {
    const now = new Date();
    const durations: Record<string, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };
    const ms = durations[expires_in];
    if (!ms) return err("expires_in must be one of: 24h, 7d, 30d, permanent");
    expiresAt = new Date(now.getTime() + ms).toISOString();
  }

  // Hash password if provided (simple SHA-256 for share links)
  let passwordHash: string | null = null;
  if (password && typeof password === "string" && password.length > 0) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    passwordHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  const { data: share, error: insertErr } = await supabase
    .from("parcel_shares")
    .insert({
      parcel_id,
      invited_email: `link:${shareToken.slice(0, 8)}`,
      role: "viewer",
      status: "pending",
      invited_by: user.id,
      share_token: shareToken,
      password_hash: passwordHash,
      expires_at: expiresAt,
    })
    .select("id, share_token, role, expires_at, created_at")
    .single();

  if (insertErr) {
    console.error("Generate link error:", insertErr);
    return err("Failed to generate share link", 500);
  }

  return created({
    ...share,
    has_password: !!passwordHash,
  });
}

// ── Helper: Accept share link ────────────────────────────────────────
async function acceptShareLink(
  supabase: ReturnType<typeof createServiceClient>,
  user: { id: string; email: string },
  token: string,
): Promise<Response> {
  const { data: share } = await supabase
    .from("parcel_shares")
    .select("id, parcel_id, role, status, expires_at, password_hash")
    .eq("share_token", token)
    .single();

  if (!share) {
    return err("Invalid or expired share link", 404);
  }

  // Check expiration
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return err("This share link has expired", 410);
  }

  // Update the share with the accepting user
  const { data: updated, error: updateErr } = await supabase
    .from("parcel_shares")
    .update({
      user_id: user.id,
      invited_email: user.email,
      status: "accepted",
      accepted_at: new Date().toISOString(),
    })
    .eq("id", share.id)
    .select("id, parcel_id, role, status")
    .single();

  if (updateErr) {
    console.error("Accept share link error:", updateErr);
    return err("Failed to accept share link", 500);
  }

  return ok({
    ...updated,
    message: "Share accepted successfully",
  });
}
