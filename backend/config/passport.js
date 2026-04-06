import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import prisma from './database.js'
import { generateToken, createSession } from '../utils/jwt.js'

// Only initialize Google OAuth if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CALLBACK_URL) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const { id, displayName, emails, photos } = profile
        const email = emails[0].value
        const picture = photos?.[0]?.value || null

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { googleId: id },
        })

        if (!user) {
          // Check if user exists with email
          user = await prisma.user.findUnique({
            where: { email },
          })

          if (user) {
            // Update existing user with Google ID and picture
            user = await prisma.user.update({
              where: { email },
              data: {
                googleId: id,
                emailVerified: true,
                picture: picture || undefined,
              },
            })
          } else {
            // Create new user
            user = await prisma.user.create({
              data: {
                name: displayName,
                email,
                googleId: id,
                picture,
                emailVerified: true,
              },
            })
          }
        } else if (picture) {
          // Refresh Google profile picture on login
          user = await prisma.user.update({
            where: { id: user.id },
            data: { picture },
          })
        }

        // Generate token and create session
        const token = generateToken(user.id)
        await createSession(user.id, token)

        done(null, {
          id: user.id,
          name: user.name,
          email: user.email,
          token,
        })
      } catch (error) {
        done(error, null)
      }
    }
  )
  )
} else {
  console.warn('⚠️  Google OAuth credentials not configured. Google login will be disabled.')
}

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((user, done) => {
  done(null, user)
})

export default passport

