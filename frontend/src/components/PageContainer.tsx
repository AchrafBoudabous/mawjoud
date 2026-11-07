import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: React.ReactNode;
  /** "page" = single-column reading routes; "wide" = list + map routes. */
  width?: "page" | "wide";
  className?: string;
};

/** The content column under the sticky header. Header and footer are
 *  rendered once by the root layout. */
export function PageContainer({ children, width = "page", className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-4 pt-6 pb-4 animate-fade-in md:gap-8 md:px-6 md:pt-10",
        width === "wide" ? "max-w-page md:max-w-wide" : "max-w-page",
        className
      )}
    >
      {children}
    </div>
  );
}
