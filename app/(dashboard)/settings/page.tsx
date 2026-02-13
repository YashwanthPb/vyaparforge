import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDivisions, getCompanyProfile, getUsers } from "./actions";
import { CompanyProfileForm } from "./company-profile-form";
import { DivisionManagement } from "./division-management";
import { ChangePasswordForm } from "./change-password-form";
import { UserManagement } from "./user-management";

export const metadata: Metadata = {
  title: "Settings | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const [divisions, companyProfile, users] = await Promise.all([
    getDivisions(),
    getCompanyProfile(),
    isAdmin ? getUsers() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Application configuration and preferences.
        </p>
      </div>

      <ChangePasswordForm />
      <CompanyProfileForm initialProfile={companyProfile} />
      <DivisionManagement divisions={divisions} />
      {isAdmin && (
        <UserManagement
          users={users}
          currentUserId={session.user.id}
        />
      )}
    </div>
  );
}
