import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { ArtSpot } from "@/components/ArtSpot";
import { press } from "@/data/press";

export const metadata: Metadata = {
  title: "press — mana jampala",
};

export default function Press() {
  return (
    <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-16 sm:px-8 sm:pt-24">
      <ArtSpot variant={2} className="left-[-70px] top-2 hidden lg:block" rotate={-8} />

      <Reveal>
        <p className="text-[13px] uppercase tracking-widest text-muted">press</p>
      </Reveal>
      <Reveal delay={0.06} className="mt-5 max-w-xl">
        <h1 className="text-[15px] leading-relaxed sm:text-base">
          coverage and mentions of me and voxa, collected here as they come in.
        </h1>
      </Reveal>

      {press.length === 0 ? (
        <Reveal delay={0.12} className="mt-20">
          <div className="rounded-2xl border border-dashed border-border/70 px-8 py-16 text-center">
            <p className="text-[14px] text-muted">nothing here yet — check back soon.</p>
          </div>
        </Reveal>
      ) : (
        <div className="mt-16 space-y-8">
          {press.map((item, i) => (
            <Reveal key={item.href} delay={i * 0.05}>
              <Link
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="neu neu-lift group block overflow-hidden rounded-2xl"
              >
                {item.image &&
                  (item.image2 ? (
                    <div className="grid w-full grid-cols-2 gap-px border-b border-border/70 bg-white">
                      <div className="aspect-[16/10] overflow-hidden">
                        <Image
                          src={item.image}
                          alt={`${item.outlet} screenshot`}
                          width={item.imageWidth ?? 1280}
                          height={item.imageHeight ?? 800}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="aspect-[16/10] overflow-hidden">
                        <Image
                          src={item.image2}
                          alt={`${item.outlet} screenshot 2`}
                          width={item.image2Width ?? 1280}
                          height={item.image2Height ?? 800}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full overflow-hidden border-b border-border/70 bg-white">
                      <Image
                        src={item.image}
                        alt={`${item.outlet} screenshot`}
                        width={item.imageWidth ?? 1280}
                        height={item.imageHeight ?? 800}
                        className="h-auto w-full"
                      />
                    </div>
                  ))}
                <div className="flex items-start justify-between gap-6 p-6 sm:p-8">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[15px] text-foreground transition-colors group-hover:text-accent">
                        {item.outlet}
                      </span>
                      {item.video && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                          video interview
                        </span>
                      )}
                      <span className="text-[12px] text-muted">{item.date}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.title}</p>
                    {item.note && <p className="mt-1.5 text-[12px] italic text-muted">{item.note}</p>}
                  </div>
                  <span className="shrink-0 text-muted transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent">
                    ↗
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
