"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { BrandMark } from "@/components/brand-mark";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/verify", label: "New verification" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="site-header">
      <nav className="nav-island" aria-label="Primary navigation">
        <Link href="/" className="brand-link" onClick={() => setOpen(false)}>
          <BrandMark />
        </Link>
        <div className="desktop-nav">
          {links.map((link) => (
            <Link
              href={link.href}
              key={link.href}
              className={pathname === link.href ? "nav-link active" : "nav-link"}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <Link href="/verify" className="nav-cta button-press">
          Start a check
          <span className="button-orb" aria-hidden="true">
            <ArrowUpRight weight="light" />
          </span>
        </Link>
        <button
          type="button"
          className={open ? "menu-toggle open" : "menu-toggle"}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          <span />
          <span />
        </button>
      </nav>
      <div id="mobile-menu" className={open ? "mobile-menu open" : "mobile-menu"}>
        <div className="mobile-menu-inner">
          {links.map((link, index) => (
            <Link href={link.href} key={link.href} onClick={() => setOpen(false)} style={{ transitionDelay: `${80 + index * 55}ms` }}>
              <span>0{index + 1}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
