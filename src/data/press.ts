export type PressItem = {
  outlet: string;
  title: string;
  date: string; // e.g. "2026-03"
  href: string;
  image?: string; // screenshot in /public/press
  imageWidth?: number; // natural pixel width of the screenshot
  imageHeight?: number; // natural pixel height of the screenshot
  image2?: string; // optional second image, shown side-by-side with image
  image2Width?: number;
  image2Height?: number;
  video?: boolean; // shows a "(video interview)" tag
  note?: string; // small muted line under the title, eg. viewing instructions
};

// Add real mentions here as they come in.
// Each item renders as a row on /press automatically.
export const press: PressItem[] = [
  {
    outlet: "the kim komando show",
    title: "featured in the final segment, talking about voxa and the ai receptionist i built",
    date: "2026-08-08",
    href: "https://www.youtube.com/watch?v=xDuMhHVUBTk",
    image: "/press/kim-komando-1.jpg",
    imageWidth: 1280,
    imageHeight: 714,
    image2: "/press/kim-komando-2.jpg",
    image2Width: 1280,
    image2Height: 718,
    video: true,
    note: "my segment is at the very end — fast-forward to the last part of the video",
  },
  {
    outlet: "india today",
    title: "12-year-old Indian-origin girl builds AI startup",
    date: "2026-07-15",
    href: "https://www.indiatoday.in/world/indians-abroad/video/12-year-old-indian-origin-girl-builds-ai-startup-2948526-2026-07-15",
    image: "/press/india-today.jpg",
    imageWidth: 1280,
    imageHeight: 908,
    video: true,
  },
  {
    outlet: "the economic times",
    title:
      "Meet Mana Jampala: The 12-year-old who learned Python at age 9 and built Voxa, an AI startup helping businesses in multiple countries avoid missed calls and customers",
    date: "2026-07-12",
    href: "https://economictimes.indiatimes.com/news/new-updates/meet-mana-jampala-the-12-year-old-who-learned-python-at-age-9-and-built-voxa-an-ai-startup-helping-businesses-in-multiple-countries-avoid-missed-calls-and-customers/articleshow/132344215.cms?from=mdr",
    image: "/press/economic-times.jpg",
    imageWidth: 1280,
    imageHeight: 796,
  },
  {
    outlet: "times of india",
    title:
      "Meet Mana Jampala: 12-year-old who built an AI-powered receptionist to help businesses avoid missing calls and clients, learnt Python at 9 and won competitions internationally",
    date: "2026-07-09",
    href: "https://timesofindia.indiatimes.com/life-style/people/meet-mana-jampala-12-year-old-who-built-an-ai-powered-receptionist-to-help-businesses-avoid-missing-calls-and-clients-learnt-python-at-9-and-won-competitions-internationally/articleshow/132283582.cms",
    image: "/press/times-of-india.jpg",
    imageWidth: 1280,
    imageHeight: 1229,
  },
  {
    outlet: "business insider",
    title: "This 12-year-old founder created an AI-powered receptionist to help small businesses build clientele",
    date: "2026-06",
    href: "https://www.businessinsider.com/gen-alpha-founder-ai-receptionist-small-businesses-young-geniuses-2026-6",
    image: "/press/business-insider.jpg",
    imageWidth: 1280,
    imageHeight: 1011,
  },
  {
    outlet: "kelownanow",
    title: "Straight From DeHart",
    date: "2026-04-15",
    href: "https://www.kelownanow.com/columns/maxine_dehart/news/Straight_from_DeHart/Straight_From_DeHart_April_15_2026/",
    image: "/press/kelownanow.jpg",
    imageWidth: 1280,
    imageHeight: 1136,
  },
];
