import { NextResponse } from "next/server";
import { TAROT_SPREADS } from "../../../lib/tarot-spreads.js";

export function GET() {
  return NextResponse.json({ spreads: TAROT_SPREADS });
}

