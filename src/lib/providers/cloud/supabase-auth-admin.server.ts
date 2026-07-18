// Cloud IAuthAdminProvider — wraps supabase-js Admin API + welcome /
// invitation email dispatch.
//
// Constructed with the service-role admin client from
// `@/integrations/supabase/client.server`. That import must stay lazy
// (inside the factory), because this module is `.server.ts` and only
// server code ever reaches it, but the bootstrap that wires it lives in
// a `.server.ts` too — the lazy import keeps a single boundary rule.

import type {
  AdminCreateUserInput,
  AdminInviteUserInput,
  AdminUserRecord,
  IAuthAdminProvider,
  UserId,
} from "@/lib/providers/interfaces";
import { Capability } from "@/lib/platform";

interface AdminClient {
  auth: {
    admin: {
      createUser: (input: unknown) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
      inviteUserByEmail: (
        email: string,
        options?: unknown,
      ) => Promise<{ data: { user: { id: string } | null }; error: { message: string } | null }>;
      deleteUser: (id: string) => Promise<{ error: { message: string } | null }>;
      updateUserById: (
        id: string,
        attrs: unknown,
      ) => Promise<{ error: { message: string } | null }>;
      listUsers: (opts?: { perPage?: number }) => Promise<{
        data: {
          users: Array<{
            id: string;
            email: string | null;
            last_sign_in_at: string | null;
            created_at: string;
          }>;
        };
        error: { message: string } | null;
      }>;
      getUserById: (id: string) => Promise<{
        data: {
          user: {
            id: string;
            email: string | null;
            last_sign_in_at: string | null;
            created_at: string;
          } | null;
        };
        error: { message: string } | null;
      }>;
    };
  };
}

export interface CloudAuthAdminDeps {
  getAdmin: () => Promise<AdminClient>;
}

export function createSupabaseAuthAdminProvider(
  deps: CloudAuthAdminDeps,
): IAuthAdminProvider {
  const { getAdmin } = deps;

  async function trySendWelcome(
    to: string,
    firstName?: string,
    workspaceName?: string | null,
  ): Promise<void> {
    try {
      const { dispatchTransactionalEmail } = await import(
        "@/lib/email/dispatch.server"
      );
      await dispatchTransactionalEmail({
        templateName: "welcome",
        recipientEmail: to,
        templateData: {
          firstName: firstName ?? to.split("@")[0],
          workspaceName: workspaceName ?? undefined,
        },
      });
    } catch (e) {
      console.error(
        "[cloud auth-admin] welcome email failed",
        (e as Error).message,
      );
    }
  }

  async function trySendInvite(
    to: string,
    inviterName: string | undefined,
    workspaceName: string | undefined | null,
    role: string,
    acceptUrl: string,
  ): Promise<void> {
    try {
      const { dispatchTransactionalEmail } = await import(
        "@/lib/email/dispatch.server"
      );
      await dispatchTransactionalEmail({
        templateName: "workspace-invitation",
        recipientEmail: to,
        templateData: {
          inviterName: inviterName ?? "An OPSQAI admin",
          workspaceName: workspaceName ?? undefined,
          role,
          acceptUrl,
        },
      });
    } catch (e) {
      console.error(
        "[cloud auth-admin] invitation email failed",
        (e as Error).message,
      );
    }
  }

  return {
    capability: Capability.Authentication,
    name: "opsqai.cloud.auth-admin",
    supportsEmailInvite: true,

    async createUser(input: AdminCreateUserInput) {
      const admin = await getAdmin();
      const { data, error } = await admin.auth.admin.createUser({
        email: input.email,
        password: input.password,
        email_confirm: input.emailConfirm !== false,
        user_metadata: {
          ...(input.metadata ?? {}),
          ...(input.mustChangePassword ? { must_change_password: true } : {}),
        },
      });
      if (error || !data.user) throw new Error(error?.message ?? "Create failed");
      if (input.welcomeEmail) {
        void trySendWelcome(
          input.email,
          input.welcomeEmail.firstName,
          input.welcomeEmail.workspaceName ?? null,
        );
      }
      return { id: data.user.id };
    },

    async inviteByEmail(input: AdminInviteUserInput) {
      const admin = await getAdmin();
      const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
        redirectTo: input.redirectTo,
        data: input.metadata ?? {},
      });
      if (error || !data.user) throw new Error(error?.message ?? "Invite failed");
      if (input.emailData) {
        void trySendInvite(
          input.email,
          input.emailData.inviterName,
          input.emailData.workspaceName ?? null,
          input.emailData.role ?? "member",
          input.redirectTo,
        );
      }
      return { id: data.user.id };
    },

    async deleteUser(userId: UserId) {
      const admin = await getAdmin();
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(error.message);
    },

    async updatePassword(userId, newPassword, opts) {
      const admin = await getAdmin();
      const attrs: Record<string, unknown> = { password: newPassword };
      if (opts?.mustChangePassword) {
        attrs.user_metadata = { must_change_password: true };
      }
      const { error } = await admin.auth.admin.updateUserById(userId, attrs);
      if (error) throw new Error(error.message);
    },

    async setDisabled(userId, disabled) {
      const admin = await getAdmin();
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: disabled ? "876000h" : "none",
      });
      if (error) throw new Error(error.message);
    },

    async listUsers(): Promise<AdminUserRecord[]> {
      const admin = await getAdmin();
      const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
      if (error) throw new Error(error.message);
      return (data.users ?? []).map((u) => ({
        id: u.id,
        email: u.email ?? "",
        lastSignInAt: u.last_sign_in_at,
        createdAt: u.created_at,
      }));
    },

    async findUserAuthMeta(userId) {
      const admin = await getAdmin();
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) throw new Error(error.message);
      const u = data.user;
      if (!u) return null;
      return {
        id: u.id,
        email: u.email ?? "",
        lastSignInAt: u.last_sign_in_at,
        createdAt: u.created_at,
      };
    },
  };
}
