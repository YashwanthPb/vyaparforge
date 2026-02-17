"use client";

import { useMemo, useState } from "react";
import zxcvbn from "zxcvbn";
import { cn } from "@/lib/utils";

interface PasswordStrengthMeterProps {
    password?: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
    const [result, setResult] = useState<zxcvbn.ZXCVBNResult | null>(null);

    useMemo(() => {
        if (!password) {
            setResult(null);
            return;
        }
        setResult(zxcvbn(password));
    }, [password]);

    if (!password) return null;

    const score = result?.score || 0;

    // Score is 0-4
    // 0: Too guessable
    // 1: Very guessable
    // 2: Somewhat guessable
    // 3: Safely unguessable
    // 4: Very unguessable

    let color = "bg-red-500";
    let label = "Weak";
    let width = 0;

    switch (score) {
        case 0:
            color = "bg-red-500";
            label = "Very Weak";
            width = 5;
            break;
        case 1:
            color = "bg-orange-500";
            label = "Weak";
            width = 25;
            break;
        case 2:
            color = "bg-yellow-500";
            label = "Fair";
            width = 50;
            break;
        case 3:
            color = "bg-blue-500";
            label = "Good";
            width = 75;
            break;
        case 4:
            color = "bg-green-500";
            label = "Strong";
            width = 100;
            break;
    }

    return (
        <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Password Strength</span>
                <span className={cn("font-medium", color.replace("bg-", "text-"))}>
                    {label}
                </span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-300 ease-in-out", color)}
                    style={{ width: `${width}%` }}
                />
            </div>
            {result?.feedback?.warning && (
                <p className="text-xs text-red-500 mt-1">{result.feedback.warning}</p>
            )}
        </div>
    );
}
