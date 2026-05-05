"use client";

const CELL_SIZE = "clamp(72px, 7.4vw, 104px)";
const GAP = "clamp(28px, 3.4vw, 50px)";
const FONT_SIZE = "clamp(60px, 6.6vw, 92px)";
// IM Fell English SC sits high in its em box; nudge down to put each glyph
// at the optical center of its cell. Verified visually against H, M, U, O.
const OPTICAL_NUDGE = "translateY(0.04em)";

export function SatorSquare2D({ glyphs }: { glyphs: string[][] }) {
  return (
    <div className="h-full w-full flex flex-col min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-section text-phosphor-dim pl-3 pt-3 shrink-0">
        THE.SQUARE
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0">
        {/* slight downward bias so the grid sits at the optical center of
            the region, not the math center (the section label up top
            visually weights the upper edge) */}
        <div
          className="grid grid-cols-5 animate-breathe"
          style={{ gap: GAP, transform: "translateY(8px)" }}
        >
          {glyphs.flat().map((g, i) => (
            <div
              key={i}
              className="flex items-center justify-center"
              style={{ width: CELL_SIZE, height: CELL_SIZE }}
            >
              <span
                className="text-phosphor-bright font-serif block"
                style={{
                  fontSize: FONT_SIZE,
                  lineHeight: 1,
                  transform: OPTICAL_NUDGE,
                }}
              >
                {g}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
