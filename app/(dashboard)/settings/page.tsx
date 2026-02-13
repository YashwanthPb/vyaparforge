import type { Metadata } from "next";
import { getDivisions, getCompanyProfile } from "./actions";
import { CompanyProfileForm } from "./company-profile-form";
import { DivisionManagement } from "./division-management";

export const metadata: Metadata = {
  title: "Settings | VyaparForge",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [divisions, companyProfile] = await Promise.all([
    getDivisions(),
    getCompanyProfile(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Application configuration and preferences.
        </p>
      </div>

      <CompanyProfileForm initialProfile={companyProfile} />
      <DivisionManagement divisions={divisions} />
    </div>
  );
}
