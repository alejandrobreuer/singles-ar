// Deterministic fantasy creature name generator.
// Given any string ID, always returns the same name — no DB column needed.

const ADJECTIVES = [
  // epic
  "Shimmering", "Ancient", "Blazing", "Frozen", "Cursed", "Mighty", "Shadow",
  "Golden", "Iron", "Storm", "Thunder", "Mystic", "Eternal", "Void", "Arcane",
  "Spectral", "Radiant", "Venomous", "Crimson", "Azure", "Obsidian",
  "Celestial", "Forsaken", "Wicked", "Savage", "Gilded", "Runic", "Infernal",
  // funny
  "Useless", "Confused", "Sleepy", "Grumpy", "Tiny", "Chunky", "Dramatic",
  "Suspicious", "Wobbly", "Caffeinated", "Anxious", "Fluffy", "Clumsy",
  "Salty", "Smug", "Soggy", "Sneaky", "Bewildered", "Mediocre", "Reluctant",
  "Retired", "Part-Time", "Budget", "Overhyped", "Discount",
];

const CREATURES = [
  // epic
  "Dragon", "Knight", "Wizard", "Paladin", "Sorcerer", "Titan", "Phoenix",
  "Griffin", "Warlord", "Serpent", "Golem", "Reaper", "Oracle", "Sentinel",
  "Specter", "Assassin", "Berserker", "Necromancer", "Valkyrie", "Demon",
  "Archon", "Revenant", "Hydra", "Chimera", "Lich",
  // funny
  "Squirrel", "Ninja", "Goblin", "Bard", "Ferret", "Platypus", "Accountant",
  "Librarian", "Intern", "Penguin", "Hamster", "Duck", "Raccoon", "Sloth",
  "Hedgehog", "Frog", "Pigeon", "Capybara", "Armadillo", "Moth",
];

function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function fantasyName(id: string): string {
  const h        = djb2(id);
  const adj      = ADJECTIVES[h % ADJECTIVES.length];
  const creature = CREATURES[(h >>> 8) % CREATURES.length];
  return `${adj} ${creature}`;
}
