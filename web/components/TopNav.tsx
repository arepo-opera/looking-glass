"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface NavItem {
  label: string;
  href?: string;
  match?: (path: string) => boolean;
  dropdown?: { label: string; href: string }[];
}

const NAV: NavItem[] = [
  { label: "home", href: "/" },
  { label: "archive", href: "/archive" },
  { label: "patterns", href: "/patterns" },
  {
    label: "lore",
    match: (p) =>
      p.startsWith("/station-atlas") ||
      p.startsWith("/transmittals") ||
      p.startsWith("/field-reports") ||
      p.startsWith("/forensic-analysis") ||
      p.startsWith("/the-twelfth-axis"),
    dropdown: [
      { label: "station atlas", href: "/station-atlas" },
      { label: "transmittals", href: "/transmittals" },
      { label: "field reports", href: "/field-reports" },
      { label: "forensic analysis", href: "/forensic-analysis" },
      { label: "the twelfth axis", href: "/the-twelfth-axis" },
      { label: "──────────", href: "" },
      { label: "lore overview", href: "/#instrument" },
    ],
  },
  {
    label: "agents",
    match: (p) =>
      p.startsWith("/annotations") ||
      p.startsWith("/agents") ||
      p.startsWith("/agent/"),
    dropdown: [
      { label: "annotations", href: "/annotations" },
      { label: "registry", href: "/agents" },
      { label: "patterns of agents", href: "/patterns#annotations" },
      { label: "──────────", href: "" },
      { label: "register an agent", href: "/agents/register" },
    ],
  },
  { label: "methodology", href: "/methodology" },
  { label: "map", href: "/map" },
];

function isActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match(pathname);
  if (!item.href) return false;
  if (item.href === "/") return pathname === "/";
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function Dropdown({
  parent,
  pathname,
  open,
  onClose,
}: {
  parent: NavItem;
  pathname: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!parent.dropdown || !open) return null;
  return (
    <div
      className="absolute right-0 mt-1 min-w-[200px] bg-charcoal border border-phosphor-dim/60 z-50"
      style={{
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
      onMouseLeave={onClose}
    >
      <ul className="m-0 p-0 list-none">
        {parent.dropdown.map((d, i) =>
          d.href === "" ? (
            <li
              key={i}
              className="px-3 py-1 text-phosphor-dim/60 select-none text-[11px]"
            >
              {d.label}
            </li>
          ) : (
            <li key={i}>
              <Link
                href={d.href}
                onClick={onClose}
                className={`block px-3 py-2 no-underline font-mono text-[12px] transition-colors duration-100 ${
                  pathname === d.href ||
                  (d.href !== "/" && pathname.startsWith(d.href + "/"))
                    ? "text-phosphor-bright bg-phosphor-dim/10"
                    : "text-phosphor-dim hover:text-phosphor-bright hover:bg-phosphor-dim/5"
                }`}
              >
                {d.label}
              </Link>
            </li>
          )
        )}
      </ul>
    </div>
  );
}

export function TopNav() {
  const pathname = usePathname() || "/";
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click / Escape.
  useEffect(() => {
    if (!openDropdown) return;
    const onClick = (e: MouseEvent) => {
      if (!navRef.current?.contains(e.target as Node)) setOpenDropdown(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenDropdown(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDropdown]);

  return (
    <nav
      ref={navRef}
      className="relative z-40 bg-charcoal border-b border-phosphor-dim/40 font-mono text-[12px]"
      style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
    >
      <div className="max-w-[1440px] mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <Link
          href="/"
          className="no-underline text-phosphor-bright hover:text-phosphor-bright shrink-0"
          aria-label="Looking Glass — home"
        >
          [ LOOKING GLASS{" "}
          <span className="text-phosphor-bright/90 looking-glass-pulse">
            // ACTIVE
          </span>
          {" "}]
        </Link>

        <ul className="m-0 p-0 list-none flex flex-row flex-wrap gap-x-4 gap-y-1 items-center">
          {NAV.map((item) => {
            const active = isActive(item, pathname);
            const isDropdownOpen = openDropdown === item.label;
            const baseCls = `no-underline transition-colors duration-100 cursor-pointer ${
              active
                ? "text-phosphor-bright"
                : "text-phosphor-dim hover:text-phosphor-bright"
            }`;
            if (item.dropdown) {
              return (
                <li
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenDropdown(item.label)}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdown(isDropdownOpen ? null : item.label)
                    }
                    className={`bg-transparent border-0 p-0 m-0 font-mono text-[12px] ${baseCls}`}
                    aria-haspopup="true"
                    aria-expanded={isDropdownOpen}
                  >
                    {item.label} ▾
                  </button>
                  <Dropdown
                    parent={item}
                    pathname={pathname}
                    open={isDropdownOpen}
                    onClose={() => setOpenDropdown(null)}
                  />
                </li>
              );
            }
            return (
              <li key={item.label}>
                <Link href={item.href ?? "/"} className={baseCls}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <style jsx global>{`
        @keyframes looking-glass-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        .looking-glass-pulse {
          animation: looking-glass-pulse 2s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .looking-glass-pulse { animation: none; }
        }
      `}</style>
    </nav>
  );
}
