import { type JSX } from "react";

export function Card({
  className,
  title,
  children,
  href,
}: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href?: string;
}): JSX.Element {
  const content = <><h2 className="font-semibold">{title}</h2><div className="mt-3">{children}</div></>;
  return href ? <a className={className} href={href}>{content}</a> : <section className={className}>{content}</section>;
}
