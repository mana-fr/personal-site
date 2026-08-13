"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { SparkleBurst } from "./Sparkles";

const LINKS = [
  { href: "/", label: "home" },
  { href: "/projects", label: "projects" },
  { href: "/press", label: "press" },
  { href: "/socials", label: "socials" },
];

const SMALL_PX = 18.4; // 1.15rem

export function Nav() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [heroPx, setHeroPx] = useState(112);
  const [burstId, setBurstId] = useState(0);
  const didMount = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const calc = () => setHeroPx(Math.min(116, Math.max(48, window.innerWidth * 0.09)));
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    setBurstId((id) => id + 1);
  }, [scrolled]);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "border-b border-border/70 bg-background/75 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <nav
        className={`mx-auto flex max-w-5xl items-end justify-between gap-6 px-6 transition-[padding] duration-500 ease-out sm:px-8 ${
          scrolled ? "pb-3" : "pb-10"
        }`}
      >
        <Link href="/" className="relative inline-block">
          <SparkleBurst burstId={burstId} />
          <motion.span
            animate={{ fontSize: scrolled ? SMALL_PX : heroPx }}
            transition={{ type: "spring", stiffness: 140, damping: 16, mass: 0.7 }}
            className="font-display block origin-top-left select-none italic leading-[1.08] tracking-tight text-foreground"
          >
            mana
            <br />
            jampala
          </motion.span>
        </Link>

        <div className="flex items-center gap-6 pb-1.5">
          <ul className="flex items-center gap-5 text-[14px] text-muted">
            {LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`relative transition-colors hover:text-foreground ${
                      active ? "text-foreground" : ""
                    }`}
                  >
                    {link.label}
                    <span
                      className={`absolute -bottom-1 left-0 h-px bg-accent transition-all duration-300 ${
                        active ? "w-full" : "w-0"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
