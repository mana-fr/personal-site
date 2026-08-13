import Link from "next/link";
import { socials } from "@/data/socials";

const FOOTER_KEYS = ["x", "linkedin", "github", "email"] as const;
const FOOTER_SOCIALS = FOOTER_KEYS.map((key) => socials.find((s) => s.key === key)!);

export function Footer() {
  return (
    <footer className="mx-auto mt-32 w-full max-w-3xl px-6 pb-14 sm:px-8">
      <div className="flex flex-col gap-4 border-t border-border/70 pt-8 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} mana jampala &middot; building voxa</p>
        <div className="flex items-center gap-4">
          {FOOTER_SOCIALS.map((s) => (
            <Link
              key={s.key}
              href={s.href}
              target={s.key === "email" ? undefined : "_blank"}
              rel={s.key === "email" ? undefined : "noopener noreferrer"}
              className="transition-colors hover:text-foreground"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
