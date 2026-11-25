import { Badge } from '../ui/Card'
/** "2 of 3 openings left". Renders nothing for listings that have no openings number set. */
export const OpeningsBadge = ({ sideHustle }) => {
  const { openings, approvedCount = 0 } = sideHustle || {}
  if (!openings) return null
  const left = Math.max(0, openings - approvedCount)
  return <Badge tone={left <= 1 ? 'amber' : 'neutral'}>{left > 0 ? `${left} of ${openings} opening${openings > 1 ? 's' : ''} left` : 'All openings filled'}</Badge>
}
