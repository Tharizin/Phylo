export type HelpSlide = {
  title: string;
  body: string[];
};

/** Short intro shown on the login page (3 slides). */
export const introSlides: HelpSlide[] = [
  {
    title: "What is Phylo?",
    body: [
      "Phylo tracks the diversity of species in your diet — not calories, not grams, just which plants, animals, and fungi you actually eat.",
      "Log what you eat, discover new species each week, and see how varied your diet really is.",
    ],
  },
  {
    title: "Earn points",
    body: [
      "First time ever logging a species: +2 for plants/fungi, +1 for animals — plus a celebration popup.",
      "Each week you also get a small bonus the first time you log a species: +0.10 plants/fungi, +0.05 animals. Repeats in the same week earn nothing.",
    ],
  },
  {
    title: "Make it social",
    body: [
      "Add friends on the Community tab, compare weekly species counts, and climb the leaderboard together.",
      "Ready? Create an account and log your first species.",
    ],
  },
];

/** Full guide available on the Help page. */
export const fullHelpSlides: HelpSlide[] = [
  {
    title: "Welcome to Phylo",
    body: [
      "Phylo is a diversity journal for what you eat. Every entry is a species — kale, cow, shiitake — not a brand or a recipe.",
      "The goal is to notice and expand the variety of life your diet depends on.",
    ],
  },
  {
    title: "How to log food",
    body: [
      "On the Dashboard, open the species search, type a common or latin name, and select a match.",
      "Confirm the log (notes are optional). Your entry appears in History and counts toward this week's species total.",
      "Can't find it? Click Add new species — but check the latin name first so you don't create a duplicate.",
    ],
  },
  {
    title: "How points work",
    body: [
      "All-time first log: +2 for a new plant or fungus, +1 for a new animal. You'll see a celebration when this happens.",
      "Weekly first log (Sunday–Saturday UTC): +0.10 for plants/fungi, +0.05 for animals — stacked on top if it's also your first time ever.",
      "Example: first kale ever → 2.10 pts (2 + 0.10). Kale again tomorrow → 0 pts. Kale in a new week → 0.10 pts.",
      "Example: first cow ever → 1.05 pts (1 + 0.05). Cow again next week → 0.05 pts only.",
      "A 5-day logging streak applies a 1.25× multiplier. Logging 15%+ new species vs. last week can earn a 1.5× bonus at week end.",
    ],
  },
  {
    title: "Adding a new species",
    body: [
      "Every species needs a latin (scientific) name — e.g. Bos taurus for cow. This prevents duplicates like two separate \"cow\" entries.",
      "If the species already exists under that latin name, you'll be prompted to log the existing entry instead.",
      "Add alternative names (beef, burger) so others can find the species by everyday words. You can also add aliases later when logging an existing species.",
    ],
  },
  {
    title: "What should you log?",
    body: [
      "Log species that meaningfully contribute to your meal — ingredients you'd list if describing what you ate.",
      "Example: corn chips → log corn and soybean (soybean oil is a main ingredient).",
      "Don't log trace ingredients. A sugary snack with a little corn syrup is not \"corn\" — the corn is incidental, not a food you ate in any real sense.",
      "When in doubt, ask: would I say \"I ate X today\"? If not, skip it.",
    ],
  },
  {
    title: "Community & friends",
    body: [
      "Open the Community tab to see everyone on Phylo, send friend requests, and keep friends at the top of your list.",
      "Each profile shows all-time and weekly species counts plus points.",
      "The weekly leaderboard ranks distinct species logged this week — compete with friends and the whole community.",
    ],
  },
];
