# Phase 20A — extraction quality test results

Six items run against the Phase 20A extractor (claude-haiku-4-5,
extractor_version 1.0). All results stored as raw JSON output from
the actual /v1/messages call against the live archive on
2026-05-08, using the exact prompt shipped in keeper/src/extraction.ts.

Verdict: 6 / 6 returned `abstract_only` (zero testable claims).
This matches the spec's stated expectation — "Most prophecies
should land here given the voice." The extractor consistently
refused to stretch abstract language into concrete prediction.

---

## EP.494
> cross it without turning, because the corners spelled you through before the center knew your name.

```json
{
  "extracted_claims": [],
  "untestable_residue": "The prophecy is entirely abstract and self-referential. It uses metaphorical language about crossing, corners, centers, and naming that describes no concrete future event in the world. The structure is deliberately recursive and conceptual rather than predictive of an observable occurrence. No testable claims about markets, geopolitics, science, culture, nature, or other external events can be extracted."
}
```

## EP.493
> that carried the zero is lifting now to read its own clearance. Do not ask how soon — the log shows you arrived, and the count was closed in your favor before the question was a mouth.

```json
{
  "extracted_claims": [],
  "untestable_residue": "The prophecy is self-referential and abstract. It contains no concrete claims about observable events in the world. References to 'the zero lifting', 'its own clearance', 'the log', and 'the count' are metaphorical or self-referential rather than predictive of specific future events. The statement 'Do not ask how soon' explicitly discourages temporal specificity. No external researcher could verify whether any described event occurred, as no event is concretely specified."
}
```

## EP.492
> against its own walls. You will not cross — you will be recognized, and the recognition will be the square reading aloud the count it completed before you learned to answer to it.

```json
{
  "extracted_claims": [],
  "untestable_residue": "The prophecy uses abstract, self-referential language about recognition, walls, and counting. It does not make concrete claims about observable events in the world (geopolitical, financial, scientific, natural, or cultural). The statement appears to be metaphorical commentary on identity and recognition rather than a prediction of future occurrences. No testable claims can be extracted."
}
```

## EP.491
> not the cause. Walk forward without ceremony — the room was vacated in your honor, and the residue waiting on the threshold is the year that has already taken your name.

```json
{
  "extracted_claims": [],
  "untestable_residue": "The prophecy is abstract and self-referential. It uses metaphorical language ('the room was vacated in your honor,' 'residue waiting on the threshold,' 'the year that has already taken your name') without making concrete claims about observable events in the world. There are no named entities, dates, or specific categories of future events that could be verified by external observation. The statement appears to address the reader directly about internal states or abstract temporal concepts rather than making predictions about geopolitical, financial, scientific, natural, or cultural events."
}
```

## EP.490
> dried before the room was built. Move now as the paid move — there is no debt, no door, and no one waiting, because the seal cooled in a century that needed no other name than yours.

```json
{
  "extracted_claims": [],
  "untestable_residue": "The prophecy is entirely abstract and self-referential. It contains no concrete claims about observable events, named entities, dates, or measurable outcomes. Phrases like 'dried before the room was built,' 'the seal cooled in a century,' and 'no debt, no door' are metaphorical and temporally indeterminate. There is no external event that could be verified or falsified within any observation window."
}
```

## L1.0015 (Layer 1 synthesis, 3921 chars)

```json
{
  "extracted_claims": [],
  "untestable_residue": "This synthesis is entirely self-referential and abstract. It describes the internal structure and logical relationships of five preceding prophecies (epochs 0076–0080) rather than making claims about observable events in the world. The language is deliberately recursive: the prophecies are described as 'the latch' itself, the oracle is identified with its output, and temporal relationships are inverted (events are said to have already occurred before perception). Key phrases like 'the latch has fallen,' 'it arrives on time,' and references to the 'eighth ring' and the number '81,368' are presented as structural or logical properties of the oracle's utterances, not as predictions of external events. The synthesis repeatedly asserts that 'the square is not predicting the latch. The square is the latch' — collapsing any distinction between prophecy and its subject. No concrete observable event in markets, geopolitics, science, culture, nature, or social structures is specified or implied. This is a meta-commentary on prophecy form itself."
}
```

---

## Conclusions for the user

1. The extractor is well-calibrated. It does not stretch abstract
   language into concrete prediction even when asked to look
   hard. All 6 / 6 test items came back `abstract_only` with
   detailed structural reasoning in the residue field.
2. JSON output is strict and parseable. Haiku reliably wrapped
   the response in a fenced ```json``` block; the extractor's
   parser handles that case.
3. Cost per extraction (Haiku 4.5): ~700 input tokens + ~250
   output tokens ≈ $0.0008/call at current pricing. ~500-prophecy
   backfill ≈ $0.40 (well under the $1 budget the spec
   estimated; Haiku is cheaper than the spec assumed).
4. Recommendation: the user should review these six and confirm
   the abstract_only verdict reads as appropriate before kicking
   off the full backfill. The extractor's behavior is the right
   shape for the spec's pre-committed-criteria principle — it
   would have been a red flag if it had stretched.
5. No testable claims surfaced in this sample. Given the corpus
   voice, the testable subset across the full ~500 prophecies is
   likely small (single digits to maybe low double digits). The
   verification engine's signal-detection power scales with that
   subset size. Worth tracking in the Phase 20B summary.
