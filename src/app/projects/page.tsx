import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { ArtSpot } from "@/components/ArtSpot";
import { projects } from "@/data/projects";

export const metadata: Metadata = {
  title: "projects — mana jampala",
};

export default function Projects() {
  return (
    <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-16 sm:px-8 sm:pt-24">
      <ArtSpot variant={0} className="right-[-70px] top-2 hidden lg:block" rotate={6} />

      <Reveal>
        <p className="text-[13px] uppercase tracking-widest text-muted">projects</p>
      </Reveal>
      <Reveal delay={0.06} className="mt-5 max-w-xl">
        <h1 className="text-[15px] leading-relaxed sm:text-base">
          everything below rolls up into voxa — the company i&apos;m building ai automation products under.
        </h1>
      </Reveal>

      <div className="mt-16 space-y-6">
        {projects.map((project, i) => (
          <Reveal key={project.slug} delay={i * 0.06}>
            <Link
              href={project.href ?? "#"}
              className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-surface p-6 transition-colors hover:border-accent/50 sm:p-8"
            >
              {i === 1 && (
                <ArtSpot
                  variant={3}
                  className="right-4 top-4 hidden sm:block"
                  size={64}
                  rotate={-12}
                />
              )}
              <div className="flex items-start justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg text-foreground transition-colors group-hover:text-accent">
                      {project.name}
                    </h2>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                      {project.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted">{project.tagline}</p>
                </div>
                <span className="shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent">
                  ↗
                </span>
              </div>
              <p className="mt-5 max-w-lg text-[14px] leading-relaxed text-muted">
                {project.description}
              </p>
            </Link>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1} className="mt-16">
        <p className="text-[13px] text-muted">
          more shipping soon — this list grows as voxa does.
        </p>
      </Reveal>
    </div>
  );
}
