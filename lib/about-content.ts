/**
 * Study links for the About page. Replace the placeholder "#" URLs below with real
 * paper links — each key matches a citation in the sections that follow.
 */
export const ABOUT_STUDY_LINKS = {
  /** American Gut Project flagship paper */
  americanGut: "https://journals.asm.org/doi/full/10.1128/msystems.00031-18",
  /** Diet diversity vs metabolic disease */
  metabolic: "https://www.tandfonline.com/doi/10.1080/27697061.2024.2423775?url_ver=Z39.88-2003&rfr_id=ori:rid:crossref.org&rfr_dat=cr_pub%20%200pubmed#abstract",
  /** Gut microbiome review paper */
  microbiomeReview: "https://link.springer.com/article/10.1186/gm228",
  /** Alali & Shori, 2026 */
  alaliShori2026: "https://www.frontiersin.org/journals/microbiomes/articles/10.3389/frmbi.2026.1717288/full#s1",
  /** Kriss et al., 2019 */
  kriss2019: "https://pmc.ncbi.nlm.nih.gov/articles/PMC6435260/",
  /** 2024 fiber meta-review */
  fiber2024: "https://pubmed.ncbi.nlm.nih.gov/38011755/",
} as const;

export type AboutLink = {
  label: string;
  href: string;
};

export type AboutSection = {
  id: string;
  title: string;
  paragraphs: { text: string; links?: AboutLink[]; linkKeys?: string[] }[];
  bullets?: string[];
};

export const whyItMattersSections: AboutSection[] = [
  {
    id: "diversity",
    title: "Why track diet diversity?",
    paragraphs: [
      {
        text: "Research points to a diet composed of diverse plants having multiple benefits. The recommendation you may have heard to eat 30 or more plant species per week comes from The American Gut Project ({flagship}), which analyzed the biodiversity within thousands of stool samples.",
        linkKeys: ["flagship"],
        links: [{ label: "read the flagship paper here", href: ABOUT_STUDY_LINKS.americanGut }],
      },
    ],
    bullets: [
      "Diverse diets are correlated with fewer antibiotic-resistance genes",
      "Those who eat diversely have a more diverse gut microbiome",
      "The number of unique plant species consumed better predicts gut flora diversity than what dietary pattern you follow (e.g. omnivore, vegan, etc.)",
    ],
  },
  {
    id: "metabolic",
    title: "Beyond dietary quality",
    paragraphs: [
      {
        text: "{metabolic} found diet diversity to be correlated with lower risk of metabolic diseases like obesity, high blood pressure, and type II diabetes. This is actually a stronger correlation than that of dietary quality. This means that it might actually be better to prioritize eating diversely rather than seeking out the highest quality, most artisanal products.",
        linkKeys: ["metabolic"],
        links: [{ label: "Another paper", href: ABOUT_STUDY_LINKS.metabolic }],
      },
    ],
  },
  {
    id: "microbiome",
    title: "But why is a diverse microbiome even important?",
    paragraphs: [
      {
        text: "This {review} offers some insights. Gut bugs are directly involved in a wide array of diseases, including obesity, IBS, and circulatory disease, and also play a role in things like drug metabolism, how many calories you absorb from food, and immune system function. The fact that this one community of bacteria can have such far-reaching effects is exciting — a better understanding of how our intestinal flora can both help and hurt us would enable new and personalized treatments for many conditions.",
        linkKeys: ["review"],
        links: [{ label: "review paper", href: ABOUT_STUDY_LINKS.microbiomeReview }],
      },
    ],
  },
  {
    id: "challenges",
    title: "Studying the gut is challenging",
    paragraphs: [
      {
        text: "However, studying this is challenging. It seems that human guts are all very different from each other, and there is no one “universal core microbiome” ({alali}). This also means that there is no way to say that someone is sick because their gut flora are abnormal: there is no “normal” to compare it to! That’s why looking at diversity can be helpful. You may not have the same composition of microbes in your digestive tract as your friend, but the sheer number of unique species and strains might be different.",
        linkKeys: ["alali"],
        links: [{ label: "Alali & Shori, 2026", href: ABOUT_STUDY_LINKS.alaliShori2026 }],
      },
      {
        text: "While we don’t yet have any research that definitively proves causation between a diverse microbiome and better health outcomes, we know that having low diversity is linked with many disease states, including IBD, acute diarrheal disease, liver cirrhosis, and even cancer ({kriss}). Of course, more research is needed, but there does seem to be compelling evidence suggesting that eating diversely will be beneficial.",
        linkKeys: ["kriss"],
        links: [{ label: "Kriss et al., 2019", href: ABOUT_STUDY_LINKS.kriss2019 }],
      },
    ],
  },
  {
    id: "fiber",
    title: "A bonus: fiber",
    paragraphs: [
      {
        text: "One final thing: if you shoot for at least 30 plant species per week, you’ll inevitably be consuming a good amount of fiber, whose benefits for gut and overall health are undisputed. This {fiber} went through 64 different studies and found that your risk of dying of cardiovascular disease, cancer, or any other cause were decreased by over 20% for individuals who ate a higher fiber diet. In general, getting more than 25g of dietary fiber per day is a good target.",
        linkKeys: ["fiber"],
        links: [{ label: "2024 review paper", href: ABOUT_STUDY_LINKS.fiber2024 }],
      },
    ],
  },
];
