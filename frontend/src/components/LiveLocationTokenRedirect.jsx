import { Navigate, useParams } from 'react-router-dom'

const LiveLocationTokenRedirect = () => {
  const { token = '' } = useParams()
  return <Navigate to={`/?liveShare=${encodeURIComponent(token)}`} replace />
}

export default LiveLocationTokenRedirect
