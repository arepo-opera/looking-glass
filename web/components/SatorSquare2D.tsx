"use client";

export function SatorSquare2D({ glyphs }: { glyphs: string[][] }) {
  return (
    <div className="h-full w-full flex flex-col min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-section text-phosphor-dim pl-3 pt-3 shrink-0">
        THE.SQUARE
      </div>
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div
          className="grid grid-cols-5 animate-breathe"
          style={{
            columnGap: "clamp(28px, 4.5vw, 60px)",
            rowGap: "clamp(20px, 3vw, 40px)",
          }}
        >
          {glyphs.flat().map((g, i) => (
            <div
              key={i}
              className="text-phosphor-bright font-serif leading-none text-center"
              style={{
                fontSize: "clamp(56px, 7vw, 96px)",
                width: "clamp(56px, 7vw, 96px)",
                height: "clamp(56px, 7vw, 96px)",
              }}
            >
              {g}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
