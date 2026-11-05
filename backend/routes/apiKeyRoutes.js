import express from 'express'
import { authenticateToken } from '../middleware/auth.js'
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  regenerateApiKey,
  revokeApiKey,
  updateApiKey,
} from '../services/apiKeyService.js'

const router = express.Router()

router.use(authenticateToken)

function sendError(res, error, fallback) {
  const status = error.status || 500
  if (status >= 500) console.error('[api-keys]', error)
  return res.status(status).json({ error: error.status ? error.message : fallback })
}

router.get('/', async (req, res) => {
  try {
    const keys = await listApiKeys(req.user.id)
    res.json({ keys })
  } catch (error) {
    sendError(res, error, 'Failed to load API keys')
  }
})

router.post('/', async (req, res) => {
  try {
    const key = await createApiKey(req.user.id, {
      name: req.body?.name,
      features: req.body?.features,
    })
    res.status(201).json({ key })
  } catch (error) {
    sendError(res, error, 'Failed to create API key')
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const key = await updateApiKey(req.user.id, req.params.id, {
      name: req.body?.name,
      features: req.body?.features,
    })
    res.json({ key })
  } catch (error) {
    sendError(res, error, 'Failed to update API key')
  }
})

router.post('/:id/regenerate', async (req, res) => {
  try {
    const key = await regenerateApiKey(req.user.id, req.params.id)
    res.json({ key })
  } catch (error) {
    sendError(res, error, 'Failed to regenerate API key')
  }
})

router.post('/:id/revoke', async (req, res) => {
  try {
    const key = await revokeApiKey(req.user.id, req.params.id)
    res.json({ key })
  } catch (error) {
    sendError(res, error, 'Failed to revoke API key')
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await deleteApiKey(req.user.id, req.params.id)
    res.json({ ok: true })
  } catch (error) {
    sendError(res, error, 'Failed to delete API key')
  }
})

export default router
