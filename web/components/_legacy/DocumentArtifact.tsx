"use client";
import React from "react";

export type DocumentType =
  | "typed"
  | "mimeograph"
  | "handwritten"
  | "letterhead"
  | "official";

export type Era =
  | "1960s"
  | "1970s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "2010s";

export type PaperVariant = "standard" | "aged" | "yellowed" | "worn";

export type CornerTreatment = "none" | "fold-tr" | "stain-tr" | "stain-bl";

export interface DocumentArtifactProps {
  /** Used as a stable seed for rotation / streak position. */
  id: string;
  documentType: DocumentType;
  era: Era;
  paperVariant?: PaperVariant;
  corner?: CornerTreatment;
  /** Override seeded rotation. Otherwise derived from id. */
  rotateDeg?: number;
  /** Optional max-width override (defaults vary by type). */
  width?: string;
  /** ARIA-friendly label so screen readers announce e.g.
   *  "scanned document, 1962 RAND memo". */
  ariaLabel?: string;
  className?: string;
  children: React.ReactNode;
}

// Deterministic small hash → 0..1.
function seedHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h >>> 0) / 0xffffffff;
}

function ink(documentType: DocumentType, era: Era): string {
  switch (documentType) {
    case "handwritten":
      return "ink-hand";
    case "mimeograph":
      return "ink-mimeo";
    case "official":
      return "ink-laser";
    case "letterhead":
    case "typed":
    default:
      // Older typed documents → faded ink class.
      return era === "1960s" || era === "1970s"
        ? "ink-typed-faded"
        : "ink-typed";
  }
}

export function DocumentArtifact({
  id,
  documentType,
  era,
  paperVariant: _paperVariant = "standard",
  corner = "none",
  rotateDeg,
  width,
  ariaLabel,
  className = "",
  children,
}: DocumentArtifactProps) {
  // Stable per-id rotation in [-2.4, +2.4] deg, and streak position in
  // [12%, 88%] so it never sits at the very edge of the page.
  const seed = seedHash(id);
  const seed2 = seedHash(id + ":streak");
  const rot = rotateDeg ?? (seed - 0.5) * 4.8;
  const streakX = 12 + seed2 * 76;
  // Show a dust streak on roughly half the documents.
  const showStreak = seed2 < 0.55;

  const cornerClass =
    corner === "stain-tr"
      ? "paper-stain-tr"
      : corner === "stain-bl"
        ? "paper-stain-bl"
        : corner === "fold-tr"
          ? "paper-fold-tr"
          : "";

  const paperEra = `paper-${era}`;
  const inkClass = ink(documentType, era);

  return (
    <div
      className={`doc-frame ${className}`}
      style={{
        transform: `rotate(${rot.toFixed(2)}deg)`,
        maxWidth: width,
      }}
    >
      <article
        role="article"
        aria-label={ariaLabel ?? `recovered document, ${era}`}
        className={`paper ${paperEra} ${cornerClass} ${inkClass} px-9 py-10`}
      >
        {showStreak ? (
          <span
            className="paper-streak"
            style={{ ["--streak-x" as any]: `${streakX.toFixed(1)}%` }}
            aria-hidden="true"
          />
        ) : null}
        {corner === "fold-tr" ? <span className="paper-fold" aria-hidden="true" /> : null}
        {children}
      </article>
    </div>
  );
}

/** Stamp — red bordered all-caps text, slight rotation. */
export function Stamp({
  text,
  rotate = -3,
  large = false,
  className = "",
}: {
  text: string;
  rotate?: number;
  large?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`stamp ${large ? "stamp-large" : ""} ${className}`}
      style={{ transform: `rotate(${rotate}deg)`, whiteSpace: "nowrap" }}
    >
      {text}
    </span>
  );
}

/** Annotation — handwritten margin note. */
export function Annotation({
  children,
  rotate = -1,
  variant = "blue",
  className = "",
}: {
  children: React.ReactNode;
  rotate?: number;
  variant?: "blue" | "pencil" | "red";
  className?: string;
}) {
  const v =
    variant === "pencil"
      ? "annotation-pencil"
      : variant === "red"
        ? "annotation-red"
        : "annotation";
  return (
    <span
      className={`${v} ${className}`}
      style={{
        display: "inline-block",
        transform: `rotate(${rotate}deg)`,
      }}
    >
      {children}
    </span>
  );
}

/** Redaction block — uses the global .redaction class which has a
 *  paper-aware override in globals.css. */
export function Redacted({ length = 8 }: { length?: number }) {
  return (
    <span className="redaction" aria-label="redacted">
      {"█".repeat(length)}
    </span>
  );
}
