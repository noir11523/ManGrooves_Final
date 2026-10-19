// Resolve cross-category contradictions when a new choice is selected.
// Mosquitoes and other negative signs can coexist with animal sightings.
export function resolveAnimalChoices(criteria, observations, group, code) {
  const negative = criteria.find(c => c.code === 'negative_signs');
  const bio = criteria.find(c => c.code === 'bio_indicators');
  if (!negative || !bio) return;
  const noAnimals = o => o.code === 'no_animals' || o.code === 'all_of_the_above';
  if (group === 'bio_indicators' && !['unknown', 'none_of_the_above'].includes(code)) {
    const selected = observations.negative_signs ?? [];
    if (!negative.options.some(o => noAnimals(o) && selected.includes(o.id))) return;
    // Keep mosquito/trash answers when replacing the inclusive shortcut.
    observations.negative_signs = negative.options.filter(o =>
      !['no_animals', 'all_of_the_above', 'unknown', 'none_of_the_above'].includes(o.code) &&
      (selected.includes(o.id) || negative.options.some(n => n.code === 'all_of_the_above' && selected.includes(n.id))))
      .map(o => o.id);
  } else if (group === 'negative_signs' && negative.options.some(o => o.code === code && noAnimals(o))) {
    observations.bio_indicators = (observations.bio_indicators ?? []).filter(id =>
      bio.options.some(o => o.id === id && ['unknown', 'none_of_the_above'].includes(o.code)));
  }
}
