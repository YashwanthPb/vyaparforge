"use client";

import { useState, useEffect } from "react";
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

type CompanyProfile = {
  companyName: string;
  gstin: string;
  address: string;
  phone: string;
  email: string;
};

const STORAGE_KEY = "vyaparforge-company-profile";

const defaults: CompanyProfile = {
  companyName: "Shri Shakthi Industries",
  gstin: "",
  address: "",
  phone: "",
  email: "",
};

export function CompanyProfileForm() {
  const [profile, setProfile] = useState<CompanyProfile>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProfile({ ...defaults, ...JSON.parse(stored) });
      }
    } catch {
      // ignore parse errors
    }
    setLoaded(true);
  }, []);

  function handleChange(field: keyof CompanyProfile, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    toast.success("Company profile saved");
  }

  if (!loaded) return null;

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
              value={profile.companyName}
              onChange={(e) => handleChange("companyName", e.target.value)}
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
          <div className="sm:col-span-2">
            <Button onClick={handleSave}>
              <Save className="mr-2 size-4" />
              Save Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
