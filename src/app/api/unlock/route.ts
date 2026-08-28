import { NextResponse } from "next/server";
import { GATE_COOKIE, codeMatches, gateIsMisconfigured } from "@/lib/gate";

export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({ code: "" }));

  // Say which of the two shut doors this is. Telling someone their code is
  // wrong when no code exists on the server sends them hunting for a typo.
  if (gateIsMisconfigured()) {
    return NextResponse.json(
      { error: "This deployment has no access code set, so nothing can unlock it yet." },
      { status: 503 }
    );
  }

  if (!codeMatches(String(code ?? ""))) {
    return NextResponse.json({ error: "That code is not right." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(GATE_COOKIE, String(code), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return response;
}
