export type SocialKey = "x" | "instagram" | "discord" | "linkedin" | "github" | "email";

export type SocialLink = {
  key: SocialKey;
  label: string;
  href: string;
};

export const socials: SocialLink[] = [
  { key: "x", label: "x", href: "https://x.com/manajampala" },
  { key: "instagram", label: "instagram", href: "https://www.instagram.com/im_manajampala/" },
  { key: "discord", label: "discord", href: "https://discord.gg/SutwzdNzqY" },
  { key: "linkedin", label: "linkedin", href: "https://www.linkedin.com/in/mana-jampala-m17/" },
  { key: "github", label: "github", href: "https://github.com/mana-fr" },
  { key: "email", label: "email", href: "mailto:mana@getvoxa.co" },
];
