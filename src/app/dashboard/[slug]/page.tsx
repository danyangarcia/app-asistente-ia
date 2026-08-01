import { redirect } from 'next/navigation'

export default async function SlugIndexPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  
  // Redirige automáticamente al tablero principal
  redirect(`/dashboard/${slug}/board`)
}