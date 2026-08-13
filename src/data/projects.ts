export type Project = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  href?: string;
  tag: string;
};

// Edit freely — add more projects here as they ship.
export const projects: Project[] = [
  {
    slug: "voxa",
    name: "voxa",
    tagline: "the company behind everything below",
    description:
      "voxa is the umbrella — an ai automation company building products that pick up the busywork for small and mid-size businesses. voxa voice and voxa agents both live under it.",
    href: "#",
    tag: "company",
  },
  {
    slug: "voxa-voice",
    name: "voxa voice",
    tagline: "ai receptionists for smbs",
    description:
      "an ai phone receptionist that answers, books, and follows up like your best front-desk hire — so smbs never miss a call again.",
    href: "#",
    tag: "product",
  },
  {
    slug: "voxa-agents",
    name: "voxa agents",
    tagline: "think lindy, but sharper",
    description:
      "autonomous ai agents that actually finish the task — built for teams who want automation without babysitting a workflow builder.",
    href: "#",
    tag: "product",
  },
];
