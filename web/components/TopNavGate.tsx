import { TopNav } from "./TopNav";

// Persistent nav on every route. The home page's dashboard uses an
// md:h-[calc(100vh-49px)] layout (vs the prior md:h-screen) to leave
// room for the nav above without losing the fixed-viewport column
// flow on desktop.
export function TopNavGate() {
  return <TopNav />;
}
