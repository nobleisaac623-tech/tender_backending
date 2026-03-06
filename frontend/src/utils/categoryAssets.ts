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
