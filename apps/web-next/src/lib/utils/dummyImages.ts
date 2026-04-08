/**
 * Free construction site images from Unsplash (no API key required for direct photo URLs).
 * Used as dummy placeholders when job/site has no uploaded images.
 */
export const DUMMY_CONSTRUCTION_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1590955559496-50316bd28ff7?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565008575538-4f6e95a7af09?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1576867757603-05b134ebc379?auto=format&fit=crop&w=800&q=80',
]

/**
 * Pick a deterministic dummy image for a job card based on job id.
 * Same job always gets the same image.
 */
export function pickDummyImage(jobId: string): string {
  let hash = 0
  for (let i = 0; i < jobId.length; i++) {
    hash = (hash * 31 + jobId.charCodeAt(i)) >>> 0
  }
  return DUMMY_CONSTRUCTION_IMAGES[hash % DUMMY_CONSTRUCTION_IMAGES.length]
}
