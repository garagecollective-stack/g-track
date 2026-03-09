import { useApp } from '../../context/AppContext'
import { DirectorDashboard } from './DirectorDashboard'
import { TeamLeadDashboard } from './TeamLeadDashboard'
import { MemberDashboard } from './MemberDashboard'

export function DashboardPage() {
  const { currentUser } = useApp()
  if (!currentUser) return null
  if (currentUser.role === 'director') return <DirectorDashboard />
  if (currentUser.role === 'teamLead') return <TeamLeadDashboard />
  return <MemberDashboard />
}
