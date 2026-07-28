import type { SVGProps } from "react";

type IconName = "brand" | "people" | "content" | "menu" | "close" | "plus" | "arrow" | "search" | "check" | "warning" | "history";

const paths: Record<IconName, React.ReactNode> = {
  brand: <><path d="M12 3 3.5 8v8L12 21l8.5-5V8L12 3Z" /><path d="m3.8 8 8.2 5 8.2-5M12 13v8" /></>,
  people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  content: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="m9 18 6-6-6-6" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  warning: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return <svg aria-hidden="true" className={`icon ${props.className ?? ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>{paths[name]}</svg>;
}
