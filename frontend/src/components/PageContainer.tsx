type PageContainerProps = {
  children: React.ReactNode;
  /** "page" = single-column reading routes; "wide" = list + map routes. */
  width?: "page" | "wide";
};

/**
 * One container, not nine copies. Renders the exact 640px / 1152px widths
 * the app already rendered before this step (the old breakpoint-alias and
 * numeric utilities both worked correctly under this project's Tailwind v4
 * setup — see docs/ARCHITECTURE.md 8.2.1). This is a DRY consolidation,
 * not a width fix: the literal container class string used to appear in
 * nine different files and had already started to drift.
 */
export function PageContainer({ children, width = "page" }: PageContainerProps) {
  return (
    <div
      className={`mx-auto flex min-h-screen w-full flex-col gap-6 px-4 py-8 animate-fade-in md:gap-8 md:px-6 ${
        width === "wide" ? "max-w-page md:max-w-wide" : "max-w-page"
      }`}
    >
      {children}
    </div>
  );
}
