import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

export function ActionLink({
  href,
  children,
  secondary = false,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
  external?: boolean;
}) {
  const className = secondary ? "action-link secondary button-press" : "action-link button-press";
  const content = (
    <>
      <span>{children}</span>
      <span className="button-orb" aria-hidden="true">
        {external ? <ArrowUpRight weight="light" /> : <ArrowRight weight="light" />}
      </span>
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
