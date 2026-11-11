// Fixed option lists from the Requirements and the data model
// (Style, Color, Project Type, Tool, Experience Level, Clothing Type).

export const CLOTHING_TYPES = ['T-shirt', 'Top', 'Pants', 'Skirt'];

export const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export const TOOLS = ['Scissors', 'Needle and Thread', 'Sewing Machine'];

export const STYLES = [
  { name: 'Streetwear', image: 'images/styles/streetwear.svg' },
  { name: 'Vintage', image: 'images/styles/vintage.svg' },
  { name: 'Y2K', image: 'images/styles/y2k.svg' },
  { name: 'Minimalist', image: 'images/styles/minimalist.svg' },
  { name: 'Cottagecore', image: 'images/styles/cottagecore.svg' },
  { name: 'Sporty', image: 'images/styles/sporty.svg' },
];

export const COLORS = [
  { name: 'Black', swatch: 'swatch-black' },
  { name: 'White', swatch: 'swatch-white' },
  { name: 'Gray', swatch: 'swatch-gray' },
  { name: 'Earth', swatch: 'swatch-earth' },
  { name: 'Pastel', swatch: 'swatch-pastel' },
  { name: 'Bold', swatch: 'swatch-bold' },
];

export const PROJECT_TYPES = ['Tops', 'Bags', 'Accessories', 'Shorts/Skirts'];

export const SUPPORTED_FILE_LABEL = 'JPG, PNG, HEIC';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export const MIN_PASSWORD_LENGTH = 8;

/** The upcycling flow, in the order shown by the progress tracker (PT1). */
export const FLOW_STEPS = ['Upload', 'Identify', 'Preferences', 'Ideas'];
