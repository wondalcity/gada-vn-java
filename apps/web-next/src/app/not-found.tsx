import { redirect } from 'next/navigation'

// Redirects unknown URLs to the default locale home page
export default function NotFound() {
  redirect('/ko')
}
