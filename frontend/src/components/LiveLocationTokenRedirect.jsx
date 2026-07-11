import { Navigate, useParams } from 'react-router-dom'

const LiveLocationTokenRedirect = () => {
  const { token = '' } = useParams()
  return <Navigate to={`/home?liveShare=${encodeURIComponent(token)}`} replace />
}

export default LiveLocationTokenRedirect
