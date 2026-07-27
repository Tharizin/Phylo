import type { ReactNode } from "react";
import type { AboutSection } from "@/lib/about-content";
import { whyItMattersSections } from "@/lib/about-content";

function renderParagraph(section: AboutSection["paragraphs"][number]): ReactNode[] {
  const keys = section.linkKeys ?? [];
  let remaining = section.text;
  const parts: ReactNode[] = [];

  keys.forEach((key, index) => {
    const token = `{${key}}`;
    const splitIndex = remaining.indexOf(token);
    if (splitIndex === -1) return;

    if (splitIndex > 0) parts.push(remaining.slice(0, splitIndex));

    const link = section.links?.[index];
    if (link) {
      parts.push(
        <a
          key={`${key}-${index}`}
          href={link.href}
          target={link.href.startsWith("http") ? "_blank" : undefined}
          rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {link.label}
        </a>
      );
    }

    remaining = remaining.slice(splitIndex + token.length);
  });

  if (remaining) parts.push(remaining);
  return parts;
}

export function AboutWhyItMatters() {
  return (
    <article className="space-y-10 border-t pt-10">
      <div className="space-y-8">
        {whyItMattersSections.map((section) => (
          <section key={section.id} className="space-y-4 border-t pt-8 first:border-t-0 first:pt-0">
            <h3 className="text-lg font-semibold">{section.title}</h3>

            <div className="space-y-4 text-[15px] leading-relaxed text-foreground/90">
              {section.paragraphs.map((paragraph, index) => (
                <p key={index}>{renderParagraph(paragraph)}</p>
              ))}
            </div>

            {section.bullets ? (
              <div className="rounded-lg border bg-muted/30 px-5 py-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">Some key findings</p>
                <ul className="space-y-2.5">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-[15px] leading-relaxed">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <footer className="rounded-lg border border-dashed bg-muted/20 px-5 py-4 text-[15px] leading-relaxed text-muted-foreground">
        You can take a look at these studies for yourself, read others, and draw your own conclusions, but one thing is
        definitely true: trying new foods is extremely fun, health benefits or not. So get out there and get logging!
      </footer>
    </article>
  );
}
