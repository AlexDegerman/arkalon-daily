import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getPlayerProfile } from '@/app/actions/getPlayerProfile'
import { ProfileView } from '@/components/profile/ProfileView'

interface PublicProfileProps {
  params: Promise<{ id: string }>
}

export default async function PublicProfilePage({
  params
}: PublicProfileProps) {
  const { id } = await params
  const res = await getPlayerProfile(id)

  if (!res.success || !res.profile) {
    notFound()
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-180 px-3 sm:px-4 pt-3">
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold tracking-wider border border-border-subtle text-text-muted transition-colors hover:text-text-primary hover:border-accent-recall font-mono"
        >
          <ArrowLeft size={12} />
          <span>LEADERBOARD</span>
        </Link>
      </div>
      <ProfileView
        profile={res.profile}
        stats={res.stats ?? []}
        isOwnProfile={false}
      />
    </main>
  )
}
