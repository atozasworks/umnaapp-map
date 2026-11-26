/**
 * Quick Survey APIs. Mounted under /api/map.
 * The place itself is saved through the normal POST /api/map/places flow
 * (duplicate check, pending approval, audit); this router only adds the
 * signboard-reading helper.
 */
import express from 'express'
import { body, validationResult } from 'express-validator'
import { authenticateToken } from '../middleware/auth.js'
import { rateLimitMiddleware } from '../middleware/rateLimit.js'
import { readSignboard, signboardAiEnabled, SURVEY_CATEGORIES } from '../services/signboardReaderService.js'

const router = express.Router()

/** Same ceiling as place photos (~450 KB image as a base64 data URL). */
const MAX_DATA_URL_LENGTH = 600000

/**
 * @route GET /api/map/survey/config
 * @desc Whether signboard reading is available on this server
 */
router.get('/survey/config', authenticateToken, (req, res) => {
  res.json({ aiEnabled: signboardAiEnabled(), categories: SURVEY_CATEGORIES })
})

/**
 * @route POST /api/map/survey/read-signboard
 * @desc Suggest place name + category from a signboard photo
 */
router.post(
  '/survey/read-signboard',
  authenticateToken,
  rateLimitMiddleware('survey:read-signboard', 30, 60),
  [
    body('imageDataUrl')
      .isString()
      .isLength({ min: 100, max: MAX_DATA_URL_LENGTH })
      .withMessage('imageDataUrl must be an image data URL (max ~450KB)')
      .matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
      .withMessage('imageDataUrl must be a base64 JPEG, PNG or WebP data URL'),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })
    try {
      const result = await readSignboard(req.body.imageDataUrl)
      res.json(result)
    } catch (error) {
      console.error('survey read-signboard error:', error)
      res.json({ aiEnabled: false, reason: 'unavailable' })
    }
  }
)

export default router
