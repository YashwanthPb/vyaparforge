"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updateCompanyProfile } from "./actions";
import type { CompanyProfileData } from "./actions";

type Props = {
  initialProfile: CompanyProfileData | null;
};

const defaults = {
  name: "Shri Shakthi Industries",
  gstin: "",
  address: "",
  phone: "",
  email: "",
  state: "",
  stateCode: "",
};

export function CompanyProfileForm({ initialProfile }: Props) {
  const [profile, setProfile] = useState({
    name: initialProfile?.name ?? defaults.name,
    gstin: initialProfile?.gstin ?? defaults.gstin,
    address: initialProfile?.address ?? defaults.address,
    phone: initialProfile?.phone ?? defaults.phone,
    email: initialProfile?.email ?? defaults.email,
    state: initialProfile?.state ?? defaults.state,
    stateCode: initialProfile?.stateCode ?? defaults.stateCode,
  });
  const [saving, setSaving] = useState(false);

  function handleChange(field: keyof typeof profile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateCompanyProfile(profile);
      if (result.success) {
        toast.success("Company profile saved");
      } else {
        toast.error(result.error ?? "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
        <CardDescription>
          Your company details used on invoices and documents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <label className="text-sm font-medium">Company Name</label>
            <Input
              value={profile.name}
              onChange={(e) => handleChange("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">GSTIN</label>
            <Input
              value={profile.gstin}
              onChange={(e) => handleChange("gstin", e.target.value)}
              placeholder="e.g. 29ABCDE1234F1Z5"
              maxLength={15}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={profile.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="e.g. +91 98765 43210"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={profile.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="e.g. info@company.com"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <Input
              value={profile.address}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Full address"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">State</label>
            <Input
              value={profile.state}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="e.g. Karnataka"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">State Code</label>
            <Input
              value={profile.stateCode}
              onChange={(e) => handleChange("stateCode", e.target.value)}
              placeholder="e.g. 29"
              maxLength={2}
            />
          </div>
          <div className="sm:col-span-2">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="mr-2 size-4" />
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
