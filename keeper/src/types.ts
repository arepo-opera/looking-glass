// Shared types used across the keeper. Mirrors the dashboard's Status enum
// so the SSE wire format matches what the dashboard expects.
export type Status = "GATHERING" | "SOLVING" | "LOCKED" | "READING";
