// Common stop words to remove from tender titles
const STOP_WORDS = [
  'supply of',
  'purchase of',
  'consultancy for',
  'provision of',
  'request for',
  'procurement of',
  'tender for',
  'contract for',
  'services for',
  'works for',
  'delivery of',
  'installation of',
];

/**
 * Extracts a keyword from tender title by removing common stop words
 * @param title - The tender title
 * @returns The extracted keyword or null if too short
 */
export function extractKeyword(title: string | null | undefined): string | null {
  if (!title) return null;
  
  let keyword = title.toLowerCase().trim();
  
  // Remove each stop word from the beginning of the title
  for (const stopWord of STOP_WORDS) {
    if (keyword.startsWith(stopWord)) {
      keyword = keyword.slice(stopWord.length).trim();
      break; // Only remove one stop word from the start
    }
  }
  
  // Also check for stop words with different casing or trailing spaces
  for (const stopWord of STOP_WORDS) {
    const regex = new RegExp(`^${stopWord}\\s+`, 'i');
    keyword = keyword.replace(regex, '');
  }
  
  // Get the first meaningful word (after removing stop words)
  const words = keyword.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return null;
  
  // Return first 1-2 words if they're meaningful
  const meaningfulWord = words[0];
  if (meaningfulWord.length < 3) return null; // Too short
  
  return meaningfulWord;
}

/**
 * Extracts the first two meaningful words from tender title (after removing stop words)
 * @param title - The tender title
 * @returns The first two words or null if too short
 */
export function extractCleanTitle(title: string | null | undefined): string | null {
  if (!title) return null;
  
  let keyword = title.toLowerCase().trim();
  
  // Remove stop words from the beginning
  for (const stopWord of STOP_WORDS) {
    if (keyword.startsWith(stopWord)) {
      keyword = keyword.slice(stopWord.length).trim();
      break;
    }
  }
  
  // Also check for stop words with different casing or trailing spaces
  for (const stopWord of STOP_WORDS) {
    const regex = new RegExp(`^${stopWord}\\s+`, 'i');
    keyword = keyword.replace(regex, '');
  }
  
  // Get words
  const words = keyword.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return null;
  
  // Take first two words
  const firstTwo = words.slice(0, 2).join(' ');
  if (firstTwo.length < 3) return null;
  
  return firstTwo;
}

/**
 * Generates a dynamic Unsplash image URL based on tender title and category
 * @param tender - The tender object with id, title, and category_name
 * @returns A unique Unsplash image URL
 */
export function getTenderImage(tender: { id: number; title?: string | null; category_name?: string | null }): string {
  // Get category - use directly from tender.category_name
  const category = tender.category_name || 'business';
  
  // Extract clean title (first two words after removing stop words)
  const cleanTitle = extractCleanTitle(tender.title ?? null);
  
  // Build the base URL using stable photo-1 endpoint
  let imageUrl = 'https://images.unsplash.com/photo-1';
  
  // Add query parameter with category and cleanTitle
  // Fallback: If cleanTitle is empty, use query=${category},business
  const query = cleanTitle && cleanTitle.length >= 2 
    ? `${category},${cleanTitle}` 
    : `${category},business`;
  
  imageUrl += `?auto=format&fit=crop&q=60&w=800&sig=${tender.id}&query=${encodeURIComponent(query)}`;
  
  return imageUrl;
}

/**
 * Returns a fallback image URL for when the main image fails to load
 * @param categoryName - Optional category name for context
 * @returns A generic fallback image URL
 */
export function getFallbackImage(categoryName?: string | null): string {
  // Use category-based fallback or default to business/technology
  const fallbackQuery = categoryName?.toLowerCase().includes('it') || categoryName?.toLowerCase().includes('technology') 
    ? 'technology' 
    : 'business';
  
  return `https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=60&w=800&sig=fallback&query=${fallbackQuery}`;
}

export const categoryAssets: Record<string, { image: string; color: string }> = {
  'IT & Technology': {
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=70',
    color: '#3b82f6',
  },
  Construction: {
    image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&q=70',
    color: '#f59e0b',
  },
  'Health & Medical': {
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=70',
    color: '#10b981',
  },
  'Office Supplies': {
    image: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400&q=70',
    color: '#8b5cf6',
  },
  Consultancy: {
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=70',
    color: '#ec4899',
  },
  'Transport & Logistics': {
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=70',
    color: '#f97316',
  },
  'Food & Catering': {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=70',
    color: '#14b8a6',
  },
  'Security Services': {
    image: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=400&q=70',
    color: '#6b7280',
  },
  'Cleaning Services': {
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=70',
    color: '#84cc16',
  },
  Other: {
    image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&q=70',
    color: '#94a3b8',
  },
};

export function getCategoryAsset(categoryName: string | null | undefined) {
  if (!categoryName) return categoryAssets['Other'];
  return categoryAssets[categoryName] ?? categoryAssets['Other'];
}
