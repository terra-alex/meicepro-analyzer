"use client";

import { ComingSoonScreen } from "./ComingSoonScreen";

export function BloodworkScreen() {
  return (
    <ComingSoonScreen
      kicker="Bloodwork · systemic correlate"
      title="Bloodwork"
      intent="Pair the scan's dermal signals with systemic labs — serum iron / TSat / ferritin, hormonal panel, inflammation markers — so the Plan generator can route to the right treatment (e.g. labs-first when iron load is high before Nd:YAG)."
      bullets={[
        "Upload PDF lab reports → parsed to structured values",
        "Trend serum iron / TSat alongside the periorbital iron index",
        "Gate `labs-first` readiness for verdicts that need correlation",
        "Surface only labs that change a recommendation, not every panel",
      ]}
      needs={[
        "PDF lab parser (Greek + English reports)",
        "Reference range library + 'within normal but worth flagging' heuristic",
        "Patient-controlled storage (no labs leave the device)",
      ]}
    />
  );
}
