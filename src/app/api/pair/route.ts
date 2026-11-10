import { NextRequest, NextResponse } from "next/server";

interface PairSessionRecord {
  code: string;
  status: "pending" | "approved";
  account?: any;
  createdAt: number;
  expiresAt: number;
}

// Global in-memory storage for active TV pairing sessions across serverless requests
declare global {
  // eslint-disable-next-line no-var
  var __tvPairSessions: Map<string, PairSessionRecord> | undefined;
}

if (!global.__tvPairSessions) {
  global.__tvPairSessions = new Map<string, PairSessionRecord>();
}

const sessions = global.__tvPairSessions;

// Clean up expired sessions periodically
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [code, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(code);
    }
  }
}

/**
 * GET /api/pair?code=XYZ
 * Polls the current state of a TV pairing session
 */
export async function GET(request: NextRequest) {
  cleanExpiredSessions();
  const searchParams = request.nextUrl.searchParams;
  const rawCode = searchParams.get("code");

  if (!rawCode) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
  }

  const code = rawCode.trim().toUpperCase();
  const session = sessions.get(code);

  if (!session) {
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    code: session.code,
    status: session.status,
    account: session.account || null,
    expiresAt: session.expiresAt,
  });
}

/**
 * POST /api/pair
 * Action 1: Create new session { action: "create", code: "XYZ" }
 * Action 2: Approve session { code: "XYZ", account: { ... } }
 */
export async function POST(request: NextRequest) {
  cleanExpiredSessions();
  try {
    const body = await request.json();
    const { action, code: rawCode, account } = body;

    if (!rawCode) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    const code = String(rawCode).trim().toUpperCase();

    if (action === "create") {
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
      sessions.set(code, {
        code,
        status: "pending",
        createdAt: Date.now(),
        expiresAt,
      });

      return NextResponse.json({
        success: true,
        code,
        expiresAt,
      });
    }

    // Default action: Approve session with authenticated account
    if (!account) {
      return NextResponse.json({ error: "Missing account payload for approval" }, { status: 400 });
    }

    const existing = sessions.get(code);
    const expiresAt = existing ? existing.expiresAt : Date.now() + 15 * 60 * 1000;

    sessions.set(code, {
      code,
      status: "approved",
      account,
      createdAt: existing?.createdAt || Date.now(),
      expiresAt,
    });

    return NextResponse.json({
      success: true,
      code,
      status: "approved",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Internal error" }, { status: 500 });
  }
}
