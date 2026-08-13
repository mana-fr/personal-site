import type { Metadata } from "next";
import Link from "next/link";
import type { ReactElement } from "react";
import { Reveal } from "@/components/Reveal";
import { ArtSpot } from "@/components/ArtSpot";
import { DiscordIcon, EmailIcon, GithubIcon, InstagramIcon, LinkedInIcon, XIcon } from "@/components/SocialIcons";
import { socials, type SocialKey } from "@/data/socials";

export const metadata: Metadata = {
  title: "socials — mana jampala",
};

const ICONS: Record<SocialKey, (props: { className?: string }) => ReactElement> = {
  x: XIcon,
  instagram: InstagramIcon,
  discord: DiscordIcon,
  linkedin: LinkedInIcon,
  github: GithubIcon,
  email: EmailIcon,
};

export default function Socials() {
  return (
    <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-16 sm:px-8 sm:pt-24">
      <ArtSpot variant={1} className="right-[-70px] top-4 hidden lg:block" rotate={10} />

      <Reveal>
        <p className="text-[13px] uppercase tracking-widest text-muted">socials</p>
      </Reveal>
      <Reveal delay={0.06} className="mt-5 max-w-xl">
        <h1 className="text-[15px] leading-relaxed sm:text-base">where to reach me online.</h1>
      </Reveal>

      <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {socials.map((item, i) => {
          const Icon = ICONS[item.key];
          return (
            <Reveal key={item.key} delay={i * 0.05}>
              <Link
                href={item.href}
                target={item.key === "email" ? undefined : "_blank"}
                rel={item.key === "email" ? undefined : "noopener noreferrer"}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-surface px-6 py-8 text-center transition-colors hover:border-accent/50"
              >
                <Icon className="h-6 w-6 text-muted transition-colors group-hover:text-accent" />
                <span className="text-[14px] text-foreground transition-colors group-hover:text-accent">
                  {item.label}
                </span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
