"use client";

interface Layer1Entry {
  layer1_index: number;
  locked_at: string | null;
  epoch_range: [number, number];
  synthesis_text: string;
}

interface Layer2Entry {
  layer2_index: number;
  locked_at: string | null;
  layer1_range: [number, number];
  synthesis_text: string;
}

interface Props {
  layer1Entries?: Layer1Entry[];
  layer2Entries?: Layer2Entry[];
}

const TRUNCATE_LAYER1 = 200;
const TRUNCATE_LAYER2 = 300;

function truncate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n).trimEnd() + "…";
}

/**
 * SYNTHESIS.LOG region beneath PROPHECY.LOG. Shows the most recent
 * Layer 1 synthesis preview and the most recent Layer 2 meta-synthesis
 * preview. Empty-state copy until the on-chain synthesis instructions
 * land and the keeper begins firing.
 */
export function SynthesisLog({
  layer1Entries = [],
  layer2Entries = [],
}: Props) {
  const layer1Newest = layer1Entries[0] ?? null;
  const layer2Newest = layer2Entries[0] ?? null;

  return (
    <div className="px-3 py-3 min-w-0">
      <div className="text-[10px] font-mono uppercase tracking-section text-phosphor-dim shrink-0">
        SYNTHESIS.LOG
      </div>
      {layer1Newest ? (
        <div className="mt-2 text-[12px] font-mono">
          <div className="flex justify-between">
            <span className="text-phosphor-bright">
              L1.{String(layer1Newest.layer1_index).padStart(4, "0")}
            </span>
            <span className="text-phosphor-dim">
              EP.
              {String(layer1Newest.epoch_range[0]).padStart(4, "0")}–EP.
              {String(layer1Newest.epoch_range[1]).padStart(4, "0")}
            </span>
          </div>
          <div className="mt-1 text-phosphor-bright leading-snug whitespace-pre-wrap">
            {truncate(layer1Newest.synthesis_text, TRUNCATE_LAYER1)}
          </div>
        </div>
      ) : (
        <p className="mt-2 italic font-serif text-phosphor-dim text-[12px] m-0 whitespace-pre-wrap">
          no syntheses yet. layer 1 fires every 100 readings — about
          every five hours of continuous operation.
        </p>
      )}

      <div className="mt-4 text-[10px] font-mono uppercase tracking-section text-phosphor-dim shrink-0">
        META.SYNTHESIS
      </div>
      {layer2Newest ? (
        <div className="mt-2 text-[12px] font-mono">
          <div className="flex justify-between">
            <span className="text-phosphor-bright">
              L2.{String(layer2Newest.layer2_index).padStart(4, "0")}
            </span>
            <span className="text-phosphor-dim">
              L1.
              {String(layer2Newest.layer1_range[0]).padStart(4, "0")}–L1.
              {String(layer2Newest.layer1_range[1]).padStart(4, "0")}
            </span>
          </div>
          <div className="mt-1 text-phosphor-bright leading-snug whitespace-pre-wrap">
            {truncate(layer2Newest.synthesis_text, TRUNCATE_LAYER2)}
          </div>
        </div>
      ) : (
        <p className="mt-2 italic font-serif text-phosphor-dim text-[12px] m-0 whitespace-pre-wrap">
          no meta-synthesis yet. first reading expected at
          approximately 125 days of operation.
        </p>
      )}
    </div>
  );
}
