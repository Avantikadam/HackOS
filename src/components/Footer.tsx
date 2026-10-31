import { Wordmark } from "./Nav";
import { ButtonLink } from "./ui";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Product overview", href: "#product" },
      { label: "How it works", href: "#how-it-works" },
      { label: "For organizers", href: "#organizers" },
      { label: "For venues", href: "#venues" },
      { label: "Trust & accountability", href: "#trust" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About HACKOS", href: "#top" },
      { label: "Careers", href: "#top" },
      { label: "Changelog", href: "#top" },
      { label: "Contact sales", href: "#plan" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Organizer guide", href: "#how-it-works" },
      { label: "Venue onboarding", href: "#venues" },
      { label: "Support centre", href: "#support" },
      { label: "System status", href: "#top" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", href: "#top" },
      { label: "Terms of service", href: "#top" },
      { label: "Cookie policy", href: "#top" },
      { label: "Acceptable use", href: "#top" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-ivory">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8">
        <div className="grid gap-10 py-14 lg:grid-cols-[1.15fr_2fr] lg:gap-16">
          <div>
            <Wordmark />
            <p className="mt-4 max-w-[22rem] text-[0.92rem] leading-relaxed text-ink-soft">
              One platform. Every hackathon. Zero operational chaos. HACKOS runs the journey from
              organizer verification to published results.
            </p>

            <div id="support" className="mt-6 scroll-mt-28 space-y-2 text-[0.86rem]">
              <p>
                <span className="font-semibold text-ink">Support</span>{" "}
                <a href="#top" className="text-cobalt underline underline-offset-2">
                  support@hackos.app
                </a>
              </p>
              <p>
                <span className="font-semibold text-ink">Partnerships</span>{" "}
                <a href="#top" className="text-cobalt underline underline-offset-2">
                  venues@hackos.app
                </a>
              </p>
            </div>

            <div id="signin" className="mt-7 flex flex-wrap gap-3 scroll-mt-28">
              <ButtonLink href="#plan" size="md">
                Plan a hackathon
              </ButtonLink>
              <ButtonLink href="#product" variant="secondary" size="md">
                Sign in
              </ButtonLink>
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.16em] text-ink-muted">
                  {col.title}
                </p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[0.88rem] text-ink-soft transition-colors duration-200 hover:text-cobalt"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-line/80 py-7 text-[0.78rem] text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HACKOS. A product demo built for this design brief.</p>
          <p className="max-w-[34rem] sm:text-right">
            Photography: Pexels (Matheus Amaral, Yan Krukau). All panels, scores and events on this
            page are sample data.
          </p>
        </div>
      </div>
    </footer>
  );
}
