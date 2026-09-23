import { getPlayerProfile } from '@/app/actions/getPlayerProfile'
import { ProfileClient } from '@/components/profile/ProfileClient'

export default async function ProfilePage() {
  const res = await getPlayerProfile()

  return (
    <ProfileClient
      initialProfile={res.profile ?? null}
      initialStats={res.stats ?? []}
    />
  )
}
