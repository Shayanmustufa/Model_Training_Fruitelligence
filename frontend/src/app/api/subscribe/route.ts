import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

interface SubscriberEntry {
  email: string;
  subscribedAt: string;
}

export async function POST(req: NextRequest) {
  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return NextResponse.json(
      { success: false, error: "Please provide a valid email address." },
      { status: 400 }
    );
  }

  try {

    const dataDir = path.join(process.cwd(), "data");
    const jsonPath = path.join(dataDir, "subscribers.json");
    const txtPath = path.join(dataDir, "subscribers.txt");

    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });

    // 1. Read existing subscribers from JSON
    let subscribers: SubscriberEntry[] = [];
    try {
      const fileData = await fs.readFile(jsonPath, "utf-8");
      subscribers = JSON.parse(fileData);
      if (!Array.isArray(subscribers)) {
        subscribers = [];
      }
    } catch {
      // File doesn't exist yet or is empty, start fresh
      subscribers = [];
    }

    const now = new Date().toISOString();
    const existingIndex = subscribers.findIndex((s) => s.email === email);

    if (existingIndex === -1) {
      // Append to JSON list
      subscribers.push({
        email,
        subscribedAt: now,
      });
      await fs.writeFile(jsonPath, JSON.stringify(subscribers, null, 2), "utf-8");

      // Append to plain text file
      const txtLine = `[${now}] ${email}\n`;
      await fs.appendFile(txtPath, txtLine, "utf-8");
    }

    // 2. Dispatch to Google Sheet Webhook (Persistent Cloud Storage & Real-time Alerts)
    const googleSheetWebhook = process.env.GOOGLE_SHEET_WEBHOOK_URL;
    if (googleSheetWebhook) {
      try {
        await fetch(googleSheetWebhook, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            email,
            timestamp: now,
            date: new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" }),
            source: "Website Footer Newsletter",
          }),
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
        });
      } catch (err) {
        console.error("Google Sheets webhook dispatch failed:", err);
      }
    }

    // 3. Best-effort sync with Python FastAPI inference backend
    const backendUrl = (process.env.CLASSIFY_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
    try {
      await fetch(`${backendUrl}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Backend not running or unreachable — cloud/local persistence succeeded
    }

    return NextResponse.json({
      success: true,
      message: "Thank you! You are subscribed.",
      email,
    });
  } catch (error) {
    console.error("Error saving subscriber email:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save email. Please try again later." },
      { status: 500 }
    );
  }
}
