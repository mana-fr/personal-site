import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { ArtSpot } from "@/components/ArtSpot";
import { LocationReveal } from "@/components/LocationReveal";
import { MontageReveal } from "@/components/MontageReveal";
import { RoadTimeline } from "@/components/RoadTimeline";
import { projects } from "@/data/projects";

const MANA_PHOTOS = [
  "/art/personal-site-mana-1.jpg",
  "/art/personal-site-mana-2.jpg",
  "/art/personal-site-mana-3.jpg",
  "/art/personal-site-mana-4.jpg",
  "/art/personal-site-mana-5.jpg",
  "/art/personal-site-mana-6.jpg",
  "/art/personal-site-mana-7.jpg",
  "/art/personal-site-mana-8.jpg",
  "/art/personal-site-mana-9.jpg",
  "/art/personal-site-mana-10.jpg",
  "/art/personal-site-mana-11.jpg",
  "/art/personal-site-mana-12.jpg",
  "/art/personal-site-mana-13.jpg",
  "/art/personal-site-mana-14.jpg",
  "/art/personal-site-mana-15.jpg",
];

export default function Home() {
  return (
    <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-16 sm:px-8 sm:pt-24">
      <ArtSpot variant={0} className="left-[-70px] top-6 hidden lg:block" rotate={-6} />
      <ArtSpot variant={1} className="right-[-70px] top-0 hidden lg:block" rotate={10} />

      <Reveal>
        <p className="text-[15px] leading-relaxed text-muted">
          hi, i&apos;m{" "}
          <MontageReveal
            label="mana"
            images={MANA_PHOTOS}
            className="text-accent underline decoration-accent/50 underline-offset-4 transition-colors hover:decoration-accent"
          />
          .
        </p>
      </Reveal>

      <Reveal delay={0.08} className="mt-4 max-w-xl">
        <h1 className="text-[15px] leading-relaxed text-foreground sm:text-base">
          12, based in{" "}
          <LocationReveal
            label="kelowna, bc"
            image="/art/personal-site-kelowna.jpg"
            className="text-accent underline decoration-accent/50 underline-offset-4 transition-colors hover:decoration-accent"
          />
          , and the founder and ceo of{" "}
          <span className="text-foreground/90">voxa voice</span> and{" "}
          <span className="text-foreground/90">voxa agents</span>. i spend most of my time building ai
          products that quietly do work most people assumed still needed a human.
        </h1>
      </Reveal>

      <Reveal delay={0.12} className="mt-6 max-w-xl">
        <p className="text-[15px] leading-relaxed text-muted">
          i started coding out of curiosity and kept going because building things that ship is more
          interesting than anything a classroom offers. voxa grew out of watching small businesses waste
          hours on calls, follow-ups, and repetitive work that ai can now just handle — so i&apos;m building
          the tools to hand that work off.
        </p>
      </Reveal>

      <section className="relative mt-28">
        <Reveal>
          <p className="text-[13px] uppercase tracking-widest text-muted">what i&apos;m building</p>
        </Reveal>

        <div className="mt-6 divide-y divide-border/70 border-t border-border/70">
          {projects.map((project, i) => (
            <Reveal key={project.slug} delay={i * 0.05}>
              <Link
                href="/projects"
                className="group flex items-center justify-between gap-6 py-5 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-[15px] text-foreground transition-colors group-hover:text-accent">
                      {project.name}
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                      {project.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-muted">{project.tagline}</p>
                </div>
                <span className="shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent">
                  ↗
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative mt-28">
        <ArtSpot variant={2} className="left-[-80px] bottom-0 hidden lg:block" size={100} rotate={-8} />
        <Reveal>
          <p className="text-[13px] uppercase tracking-widest text-muted">how this started</p>
        </Reveal>

        <Reveal delay={0.06} className="mt-10">
          <RoadTimeline />
        </Reveal>
      </section>

      <section className="relative mt-28">
        <ArtSpot variant={3} className="right-[-60px] top-2 hidden lg:block" size={100} rotate={-10} />
        <Reveal>
          <p className="text-[13px] uppercase tracking-widest text-muted">outside of voxa</p>
        </Reveal>
        <Reveal delay={0.06} className="mt-5 max-w-xl">
          <p className="text-[15px] leading-relaxed text-muted">
            i play select academy soccer, and i&apos;m a huge extrovert who loves meeting people and
            traveling to learn about new cultures. i&apos;ll read almost anything, but i&apos;m especially
            into psychology — cognitive biases, social proof, cialdini&apos;s work — and philosophy, mostly
            plato&apos;s world of forms and descartes. also a big fan of dogs, sushi, and boba tea.
          </p>
        </Reveal>
      </section>
    </div>
  );
}
