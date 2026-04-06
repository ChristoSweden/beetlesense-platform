/**
 * share-invite  —  Multi-owner forest sharing edge function.
 *
 * POST   /share-invite              — Create share invitation(s)
 * GET    /share-invite?type=...     — List shares (my_shares, shared_with_me, parcels)
 * PATCH  /share-invite              — Update share (role, status, permissions)
 * DELETE /share-invite              — Revoke share
 *
 * Body (POST):
 *   {
 *     email: string,
 *     role: "viewer" | "editor" | "manager" | "advisor",
 *     permissions: { view_health: bool, ... },
 *     parcel_ids: string[],
 *     expires_at?: string | null,
 *     note?: string | null
 *   }
 *
 * Body (PATCH):
 *   { share_id: string, role?: string, status?: string, permissions?: object }
 *
 * Body (DELETE):
 *   { share_id: string }
 *
 * Query (GET):
 *   ?type=my_shares       — Shares I created (as owner)
 *   ?type=shared_with_me  — Parcels shared with me
 *   ?type=parcels         — My parcels (for the invite form selector)
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, created, err } from "../_shared/response.ts";

const VALID_ROLES = ["viewer", "editor", "manager", "advisor"];
const VALID_STATUSES = ["pending", "accepted", "declined", "revoked"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  try {
    const user = await getUser(req);
    const supabase = createServiceClient();
    const url = new URL(req.url);

    // ── GET: List shares ─────────────────────────────────────────────
    if (req.method === "GET") {
      const type = url.searchParams.get("type");

      if (type === "my_shares") {
        return await listMyShares(supabase, user.id);
      }

      if (type === "shared_with_me") {
        return await listSharedWithMe(supabase, user);
      }

      if (type === "parcels") {
        return await listMyParcels(supabase, user.id);
      }

      return err("type query parameter is required (my_shares, shared_with_me, parcels)");
    }

    // ── POST: Create share invitation ────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body) return err("Invalid JSON body");

      const { email, role, permissions, parcel_ids, expires_at, note } = body as {
        email?: string;
        role?: string;
        permissions?: Record<string, boolean>;
        parcel_ids?: string[];
        expires_at?: string | null;
        note?: string | null;
      };

      if (!email || typeof email !== "string") {
        return err("email is required");
      }
      if (!role || !VALID_ROLES.includes(role)) {
        return err(`role must be one of: ${VALID_ROLES.join(", ")}`);
      }
      if (!parcel_ids || !Array.isArray(parcel_ids) || parcel_ids.length === 0) {
        return err("parcel_ids must be a non-empty array");
      }

      // Don't allow sharing with yourself
      if (email.toLowerCase() === user.email.toLowerCase()) {
        return err("You cannot share a parcel with yourself");
      }

      // Verify the user owns all the parcels
      const { data: ownedParcels } = await supabase
        .from("parcels")
        .select("id")
        .in("id", parcel_ids)
        .eq("created_by", user.id);

      const ownedIds = new Set((ownedParcels ?? []).map((p: { id: string }) => p.id));
      const unauthorized = parcel_ids.filter((id) => !ownedIds.has(id));
      if (unauthorized.length > 0) {
        return err(`You do not own parcels: ${unauthorized.join(", ")}`, 403);
      }

      // Check if the invited email belongs to an existing user
      const { data: invitedUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      // Create share records for each parcel
      const shares = parcel_ids.map((parcel_id) => ({
        parcel_id,
        owner_id: user.id,
        shared_with_email: email.toLowerCase(),
        shared_with_user_id: invitedUser?.id ?? null,
        role,
        status: invitedUser ? "accepted" : "pending",
        permissions: permissions ?? getDefaultPermissions(role),
        accepted_at: invitedUser ? new Date().toISOString() : null,
        expires_at: expires_at ?? null,
        note: note ?? null,
      }));

      const { data: inserted, error: insertErr } = await supabase
        .from("forest_shares")
        .upsert(shares, { onConflict: "parcel_id,shared_with_email" })
        .select("id, parcel_id, shared_with_email, role, status, invited_at");

      if (insertErr) {
        console.error("Insert share error:", insertErr);
        return err("Failed to create share invitation", 500);
      }

      // Log activity
      for (const share of inserted ?? []) {
        await supabase.from("share_activity_log").insert({
          share_id: share.id,
          actor_id: user.id,
          action: "invited",
          details: { email: email.toLowerCase(), role, parcel_id: share.parcel_id },
        });
      }

      // Send invitation email if user doesn't exist yet
      if (!invitedUser) {
        try {
          await supabase.auth.admin.inviteUserByEmail(email.toLowerCase(), {
            data: {
              invited_to_parcels: parcel_ids,
              share_ids: (inserted ?? []).map((s: { id: string }) => s.id),
            },
          });
        } catch (emailErr) {
          console.warn("Failed to send invitation email:", emailErr);
          // Non-fatal — share records are still created
        }
      }

      return created(inserted);
    }

    // ── PATCH: Update share ──────────────────────────────────────────
    if (req.method === "PATCH") {
      const body = await req.json().catch(() => null);
      if (!body) return err("Invalid JSON body");

      const { share_id, role, status, permissions } = body as {
        share_id?: string;
        role?: string;
        status?: string;
        permissions?: Record<string, boolean>;
      };

      if (!share_id) return err("share_id is required");

      // Fetch the share and verify ownership
      const { data: share } = await supabase
        .from("forest_shares")
        .select("id, owner_id, shared_with_user_id")
        .eq("id", share_id)
        .single();

      if (!share) return err("Share not found", 404);

      // Owner can update anything; shared user can only accept/decline
      const isOwner = share.owner_id === user.id;
      const isSharedUser = share.shared_with_user_id === user.id;

      if (!isOwner && !isSharedUser) {
        return err("You do not have permission to modify this share", 403);
      }

      if (!isOwner && (role || permissions)) {
        return err("Only the owner can change role or permissions", 403);
      }

      const updates: Record<string, unknown> = {};
      if (role && VALID_ROLES.includes(role)) updates.role = role;
      if (status && VALID_STATUSES.includes(status)) {
        updates.status = status;
        if (status === "accepted") updates.accepted_at = new Date().toISOString();
      }
      if (permissions) updates.permissions = permissions;

      if (Object.keys(updates).length === 0) {
        return err("No valid updates provided");
      }

      const { data: updated, error: updateErr } = await supabase
        .from("forest_shares")
        .update(updates)
        .eq("id", share_id)
        .select("id, role, status, permissions")
        .single();

      if (updateErr) {
        console.error("Update share error:", updateErr);
        return err("Failed to update share", 500);
      }

      // Log activity
      await supabase.from("share_activity_log").insert({
        share_id,
        actor_id: user.id,
        action: status ? `status_${status}` : "updated",
        details: updates,
      });

      return ok(updated);
    }

    // ── DELETE: Revoke share ─────────────────────────────────────────
    if (req.method === "DELETE") {
      const body = await req.json().catch(() => null);
      if (!body) return err("Invalid JSON body");

      const { share_id } = body as { share_id?: string };
      if (!share_id) return err("share_id is required");

      // Fetch the share
      const { data: share } = await supabase
        .from("forest_shares")
        .select("id, owner_id, shared_with_user_id")
        .eq("id", share_id)
        .single();

      if (!share) return err("Share not found", 404);

      // Owner can revoke, or shared user can remove themselves
      const isOwner = share.owner_id === user.id;
      const isSelf = share.shared_with_user_id === user.id;
      if (!isOwner && !isSelf) {
        return err("You do not have permission to revoke this share", 403);
      }

      // Soft-revoke: set status to 'revoked' instead of deleting
      const { error: revokeErr } = await supabase
        .from("forest_shares")
        .update({ status: "revoked" })
        .eq("id", share_id);

      if (revokeErr) {
        console.error("Revoke share error:", revokeErr);
        return err("Failed to revoke share", 500);
      }

      // Log activity
      await supabase.from("share_activity_log").insert({
        share_id,
        actor_id: user.id,
        action: "revoked",
        details: { revoked_by: isOwner ? "owner" : "self" },
      });

      return ok({ revoked: true });
    }

    return err("Method not allowed", 405);
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("share-invite error:", e);
    return err(message, status);
  }
});

// ── Helper: List my shares (as owner) ────────────────────────────────
async function listMyShares(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<Response> {
  const { data: shares, error: listErr } = await supabase
    .from("forest_shares")
    .select(`
      id,
      parcel_id,
      owner_id,
      shared_with_email,
      shared_with_user_id,
      role,
      status,
      permissions,
      invited_at,
      accepted_at,
      expires_at,
      note
    `)
    .eq("owner_id", userId)
    .order("invited_at", { ascending: false });

  if (listErr) {
    console.error("List my shares error:", listErr);
    return err("Failed to fetch shares", 500);
  }

  if (!shares || shares.length === 0) return ok([]);

  // Enrich with parcel names
  const parcelIds = [...new Set(shares.map((s: Record<string, unknown>) => s.parcel_id as string))];
  const { data: parcels } = await supabase
    .from("parcels")
    .select("id, name")
    .in("id", parcelIds);

  const parcelMap = new Map(
    (parcels ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
  );

  // Enrich with shared-user profiles
  const userIds = shares
    .filter((s: Record<string, unknown>) => s.shared_with_user_id)
    .map((s: Record<string, unknown>) => s.shared_with_user_id as string);

  let profileMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);
    profileMap = new Map(
      (profiles ?? []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name ?? ""]),
    );
  }

  const enriched = shares.map((s: Record<string, unknown>) => ({
    ...s,
    parcel_name: parcelMap.get(s.parcel_id as string) ?? "Unknown",
    shared_with_name: s.shared_with_user_id
      ? profileMap.get(s.shared_with_user_id as string) ?? null
      : null,
  }));

  return ok(enriched);
}

// ── Helper: List parcels shared with me ──────────────────────────────
async function listSharedWithMe(
  supabase: ReturnType<typeof createServiceClient>,
  user: { id: string; email: string },
): Promise<Response> {
  const { data: shares, error: listErr } = await supabase
    .from("forest_shares")
    .select(`
      id,
      parcel_id,
      owner_id,
      role,
      status,
      permissions,
      invited_at,
      note
    `)
    .or(`shared_with_user_id.eq.${user.id},shared_with_email.eq.${user.email.toLowerCase()}`)
    .in("status", ["pending", "accepted"])
    .order("invited_at", { ascending: false });

  if (listErr) {
    console.error("List shared with me error:", listErr);
    return err("Failed to fetch shared parcels", 500);
  }

  if (!shares || shares.length === 0) return ok([]);

  // Enrich with parcel names
  const parcelIds = [...new Set(shares.map((s: Record<string, unknown>) => s.parcel_id as string))];
  const { data: parcels } = await supabase
    .from("parcels")
    .select("id, name")
    .in("id", parcelIds);

  const parcelMap = new Map(
    (parcels ?? []).map((p: { id: string; name: string }) => [p.id, p.name]),
  );

  // Enrich with owner profiles
  const ownerIds = [...new Set(shares.map((s: Record<string, unknown>) => s.owner_id as string))];
  const { data: ownerProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ownerIds);

  const ownerMap = new Map(
    (ownerProfiles ?? []).map((p: { id: string; full_name: string | null; email: string }) => [
      p.id,
      { name: p.full_name ?? "", email: p.email },
    ]),
  );

  const enriched = shares.map((s: Record<string, unknown>) => {
    const owner = ownerMap.get(s.owner_id as string);
    return {
      ...s,
      parcel_name: parcelMap.get(s.parcel_id as string) ?? "Unknown",
      owner_name: owner?.name ?? "Unknown",
      owner_email: owner?.email ?? "",
    };
  });

  return ok(enriched);
}

// ── Helper: List my parcels ──────────────────────────────────────────
async function listMyParcels(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
): Promise<Response> {
  const { data: parcels, error: listErr } = await supabase
    .from("parcels")
    .select("id, name")
    .eq("created_by", userId)
    .order("name", { ascending: true });

  if (listErr) {
    console.error("List parcels error:", listErr);
    return err("Failed to fetch parcels", 500);
  }

  return ok(parcels ?? []);
}

// ── Helper: Default permissions for a role ───────────────────────────
function getDefaultPermissions(role: string): Record<string, boolean> {
  switch (role) {
    case "viewer":
      return {
        view_health: true,
        view_financial: false,
        view_operations: false,
        edit_parcels: false,
        manage_surveys: false,
        manage_sales: false,
      };
    case "editor":
      return {
        view_health: true,
        view_financial: true,
        view_operations: true,
        edit_parcels: true,
        manage_surveys: false,
        manage_sales: false,
      };
    case "manager":
      return {
        view_health: true,
        view_financial: true,
        view_operations: true,
        edit_parcels: true,
        manage_surveys: true,
        manage_sales: true,
      };
    case "advisor":
      return {
        view_health: true,
        view_financial: true,
        view_operations: true,
        edit_parcels: false,
        manage_surveys: false,
        manage_sales: false,
      };
    default:
      return { view_health: true };
  }
}
