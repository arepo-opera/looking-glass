interface Props {
  programId: string;
  blockHeight: number;
  rpcOk: boolean;
}

// Non-breaking spaces so whitespace between word boundaries can't collapse
// inside an inline-flex layout.
const SEP = "  ·  ";
const MOTTO = `SATOR${SEP}AREPO${SEP}TENET${SEP}OPERA${SEP}ROTAS${SEP}`;

export function BottomBar({ programId, blockHeight, rpcOk }: Props) {
  return (
    <footer className="h-[24px] shrink-0 border-t border-phosphor-dim flex items-center justify-between text-[12px] font-mono overflow-hidden">
      <div className="flex-1 overflow-hidden text-phosphor-dim min-w-0">
        {/* Two identical copies side-by-side; animation ends at -50%, so
            the second copy lands precisely where the first one started. */}
        <div
          className="inline-flex animate-scroll-x will-change-transform"
          style={{ whiteSpace: "pre" }}
        >
          <span className="shrink-0">{MOTTO}</span>
          <span className="shrink-0" aria-hidden="true">
            {MOTTO}
          </span>
        </div>
      </div>
      <div className="px-3 flex gap-4 shrink-0 leading-[24px]">
        <span>
          <span className="text-phosphor-dim">PRG </span>
          <span className="text-phosphor-bright">
            {programId.slice(0, 4)}...{programId.slice(-4)}
          </span>
        </span>
        <span>
          <span className="text-phosphor-dim">BLK </span>
          <span className="text-phosphor-bright tabular-nums">
            {blockHeight.toLocaleString()}
          </span>
        </span>
        <span>
          <span className="text-phosphor-dim">RPC </span>
          <span
            className={rpcOk ? "text-phosphor-bright" : "text-warning-red"}
          >
            {rpcOk ? "OK" : "ERR"}
          </span>
        </span>
      </div>
    </footer>
  );
}
