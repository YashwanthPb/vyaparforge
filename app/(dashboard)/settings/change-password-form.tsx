"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { changeMyPassword } from "./actions";

function getStrength(password: string): { label: string; color: string; width: string } {
  if (password.length === 0) return { label: "", color: "", width: "0%" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { label: "Weak", color: "bg-destructive", width: "33%" };
  if (score <= 3) return { label: "Medium", color: "bg-yellow-500", width: "66%" };
  return { label: "Strong", color: "bg-green-500", width: "100%" };
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="pr-10"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function ChangePasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");

  const strength = getStrength(newPw);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!current) { toast.error("Current password is required."); return; }
    if (!newPw) { toast.error("New password is required."); return; }
    if (newPw !== confirm) { toast.error("New passwords do not match."); return; }

    startTransition(async () => {
      const result = await changeMyPassword(current, newPw);
      if (result.success) {
        toast.success("Password changed successfully");
        setCurrent("");
        setNewPw("");
        setConfirm("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="text-muted-foreground size-5" />
          <div>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <PasswordField
            id="current-password"
            label="Current Password"
            value={current}
            onChange={setCurrent}
            placeholder="Enter current password"
          />
          <PasswordField
            id="new-password"
            label="New Password"
            value={newPw}
            onChange={setNewPw}
            placeholder="Min 8 chars, upper, lower, number"
          />
          {newPw.length > 0 && (
            <div className="space-y-1">
              <div className="bg-muted h-1.5 w-full rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${strength.color}`}
                  style={{ width: strength.width }}
                />
              </div>
              <p className="text-muted-foreground text-xs">
                Password strength:{" "}
                <span
                  className={
                    strength.label === "Strong"
                      ? "text-green-600 font-medium"
                      : strength.label === "Medium"
                        ? "text-yellow-600 font-medium"
                        : "text-destructive font-medium"
                  }
                >
                  {strength.label}
                </span>
              </p>
            </div>
          )}
          <PasswordField
            id="confirm-password"
            label="Confirm New Password"
            value={confirm}
            onChange={setConfirm}
            placeholder="Re-enter new password"
          />
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Update Password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
