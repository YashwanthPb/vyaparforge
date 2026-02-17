import { NextRequest, NextResponse } from "next/server";
import { processPaymentRecords, PaymentRecord } from "@/lib/payment-sync-service";

export async function POST(req: NextRequest) {
    // 1. Authenticate
    const apiKey = req.headers.get("x-api-key");
    const envApiKey = process.env.PAYMENT_SYNC_API_KEY;

    if (!envApiKey || apiKey !== envApiKey) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const body = await req.json();
        if (!Array.isArray(body)) {
            return NextResponse.json(
                { error: "Invalid body, expected array of payment records" },
                { status: 400 }
            );
        }

        const records = body as PaymentRecord[];
        const results = await processPaymentRecords(records, "API_KEY_USER");

        return NextResponse.json(results);

    } catch (error: any) {
        console.error("Payment Sync API Error:", error);
        return NextResponse.json(
            { error: "Internal Server Error", message: error.message },
            { status: 500 }
        );
    }
}
