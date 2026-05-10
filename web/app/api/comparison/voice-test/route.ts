import { NextResponse } from "next/server";
import { buildTest } from "@/lib/voice-comparison";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INSTRUCTIONS =
  "Read all prophecies. For each, assess whether the voice feels consistent with the project's established style. Identify any prophecies that feel notably different in voice, register, or quality from the others. Then guess which group corresponds to which model configuration. The answer key is at /api/comparison/voice-test/key after you've made your assessment.";

export async function GET() {
  const built = await buildTest();
  if ("error" in built) {
    return NextResponse.json(built, { status: 503 });
  }
  const { answer_key: _key, ...publicPayload } = built;
  return NextResponse.json(
    {
      ...publicPayload,
      instructions: INSTRUCTIONS,
      next: "/api/comparison/voice-test/key",
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600",
      },
    }
  );
}
