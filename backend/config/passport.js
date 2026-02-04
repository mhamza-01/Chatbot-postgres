import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import prisma from './database.js';
import dotenv from "dotenv";
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔍 Google Profile:', profile);

        // Check if user exists with googleId
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id }
        });

        if (user) {
          console.log('✅ Existing Google user found:', user);
          return done(null, user);
        }

        // Check if user exists with same email
        user = await prisma.user.findUnique({
          where: { email: profile.emails[0].value }
        });

        if (user) {
          // Link Google account to existing local account
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: profile.id,
              profilePicture: profile.photos[0]?.value,
              authProvider: 'GOOGLE'
            }
          });

          console.log('🔗 Linked Google to existing account:', user.email);
          return done(null, user);
        }

        // Create new user
        user = await prisma.user.create({
          data: {
            googleId: profile.id,
            username: profile.displayName || profile.emails[0].value.split('@')[0],
            email: profile.emails[0].value,
            profilePicture: profile.photos[0]?.value,
            authProvider: 'GOOGLE',
          }
        });

        console.log('✅ New Google user created:', user.email);
        done(null, user);
      } catch (error) {
        console.error('❌ Google Auth Error:', error);
        done(error, null);
      }
    }
  )
);

export default passport;