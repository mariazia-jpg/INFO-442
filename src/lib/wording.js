// Small helpers so headings read naturally for every clothing type.

/** "We think this is a T-shirt" / "We think these are pants" */
export function identifiedHeading(type) {
  if (type === 'Pants') return 'We think these are pants. Is this right?';
  if (type === 'T-shirt') return 'We think this is a T-shirt. Is this right?';
  return `We think this is a ${type.toLowerCase()}. Is this right?`;
}

/** "your T-shirt", "your top", "your pants" */
export function yourItem(type) {
  if (!type) return 'your item';
  return `your ${type === 'T-shirt' ? 'T-shirt' : type.toLowerCase()}`;
}
