interface Props {
  programId: string;
  blockHeight: number;
  rpcOk: boolean;
}

const MOTTO = "SATOR · AREPO · TENET · OPERA · ROTAS";
const SPACER = "    ";

export function BottomBar({ programId, blockHeight, rpcOk }: Props) {
  // Repeat the motto enough times to fill 2x viewport width, then animate by -50%
  // for a seamless loop.
  const block = (MOTTO + SPACER).repeat(8);
  return (
    <footer className="h-[24px] shrink-0 border-t border-phosphor-dim flex items-center justify-between text-[12px] font-mono overflow-hidden">
      <div className="flex-1 overflow-hidden whitespace-nowrap text-phosphor-dim min-w-0">
        <div className="inline-block animate-scroll-x will-change-transform">
          {block}
          {block}
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
