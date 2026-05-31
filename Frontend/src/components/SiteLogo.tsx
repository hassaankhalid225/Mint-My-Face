import Image from "next/image";
import Link from "next/link";

const HEIGHT = { sm: 36, md: 44, lg: 52 } as const;

type SiteLogoProps = {
  href?: string;
  size?: keyof typeof HEIGHT;
  priority?: boolean;
  className?: string;
};

export default function SiteLogo({
  href = "/",
  size = "md",
  priority = false,
  className = "",
}: SiteLogoProps) {
  const h = HEIGHT[size];

  const mark = (
    <span className={`site-logo ${className}`.trim()} style={{ ["--site-logo-h" as string]: `${h}px` }}>
      <Image
        src="/logo.png"
        alt="Mint My Face Studio"
        width={h}
        height={h}
        className="site-logo__img"
        priority={priority}
      />
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="site-logo-link" aria-label="Mint My Face Studio — Home">
      {mark}
    </Link>
  );
}
