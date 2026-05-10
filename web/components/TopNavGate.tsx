"use client";
import { usePathname } from "next/navigation";
import { TopNav } from "./TopNav";

// The home page (/) renders the dashboard layout that occupies the
// full viewport with its own internal scroll regions. A persistent
// top nav bar would steal vertical space from the SatorSquare3D and
// disrupt the side-by-side column layout. Suppress the nav there;
// the home page is reachable from every other page via the
// "[ LOOKING GLASS // ACTIVE ]" identifier.
export function TopNavGate() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <TopNav />;
}
