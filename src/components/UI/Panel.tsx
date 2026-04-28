import type { HTMLAttributes, ReactNode } from "react";

export function Panel({
  title,
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={`${className}`} {...props}>
      {title ? (
        <h3 className="mb-3 text-sm font-medium text-zinc-400">{title}</h3>
      ) : null}
      {children}
    </div>
  );
}
