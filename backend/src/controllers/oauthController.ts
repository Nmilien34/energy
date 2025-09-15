import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User, IUser } from '../models/User';
import { config } from '../utils/config';
import jwt from 'jsonwebtoken';
import { STATUS_CODES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants';

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: config.youtube.clientId,
  clientSecret: config.youtube.clientSecret,
  callbackURL: "/api/auth/google/callback",
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/youtube.readonly'
  ]
}, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ googleId: profile.id });

    if (user) {
      // Update existing user's tokens
      user.youtubeAccessToken = accessToken;
      user.youtubeRefreshToken = refreshToken;
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }

    // Check if user exists with this email
    user = await User.findOne({ email: profile.emails[0].value });

    if (user) {
      // Link Google account to existing user
      user.googleId = profile.id;
      user.youtubeAccessToken = accessToken;
      user.youtubeRefreshToken = refreshToken;
      user.lastLogin = new Date();
      await user.save();
      return done(null, user);
    }

    // Create new user
    const newUser = new User({
      googleId: profile.id,
      email: profile.emails[0].value,
      username: profile.displayName || profile.emails[0].value.split('@')[0],
      profilePicture: profile.photos[0]?.value,
      youtubeAccessToken: accessToken,
      youtubeRefreshToken: refreshToken,
      password: 'google-oauth', // Placeholder - won't be used for OAuth users
      lastLogin: new Date()
    });

    await newUser.save();
    return done(null, newUser);

  } catch (error) {
    console.error('OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

// OAuth Controllers
export const googleAuth = passport.authenticate('google', {
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/youtube.readonly'
  ]
});

export const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  passport.authenticate('google', { session: false }, async (err: any, user: IUser) => {
    try {
      if (err) {
        console.error('Google OAuth error:', err);
        return res.redirect(`${config.frontend.url}/auth/error?message=oauth_error`);
      }

      if (!user) {
        return res.redirect(`${config.frontend.url}/auth/error?message=user_not_found`);
      }

      // Generate JWT token
      const token = generateToken(user._id.toString());

      // Redirect to frontend with token
      res.redirect(`${config.frontend.url}/auth/success?token=${token}`);

    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`${config.frontend.url}/auth/error?message=callback_error`);
    }
  })(req, res, next);
};

// Link Google account to existing user (for users who signed up with email/password)
export const linkGoogleAccount = passport.authenticate('google', {
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/youtube.readonly'
  ]
});

// Get user's YouTube channel info
export const getYouTubeProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;

    if (!user.youtubeAccessToken) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'YouTube account not connected'
      });
    }

    // Use Google APIs to get YouTube channel info
    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
      access_token: user.youtubeAccessToken,
      refresh_token: user.youtubeRefreshToken
    });

    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'statistics'],
      mine: true
    });

    const channel = channelResponse.data.items?.[0];

    if (!channel) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'YouTube channel not found'
      });
    }

    res.json({
      success: true,
      data: {
        channelId: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
        viewCount: channel.statistics?.viewCount
      }
    });

  } catch (error) {
    console.error('Get YouTube profile error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Disconnect YouTube account
export const disconnectYouTube = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;

    // Remove YouTube tokens
    await User.findByIdAndUpdate(user._id, {
      $unset: {
        youtubeAccessToken: 1,
        youtubeRefreshToken: 1,
        googleId: 1
      }
    });

    res.json({
      success: true,
      data: {
        message: 'YouTube account disconnected successfully'
      }
    });

  } catch (error) {
    console.error('Disconnect YouTube error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Refresh YouTube access token
export const refreshYouTubeToken = async (userId: string): Promise<string | null> => {
  try {
    const user = await User.findById(userId);

    if (!user?.youtubeRefreshToken) {
      return null;
    }

    const { google } = require('googleapis');
    const oauth2Client = new google.auth.OAuth2(
      config.youtube.clientId,
      config.youtube.clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: user.youtubeRefreshToken
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.access_token) {
      // Update user with new access token
      await User.findByIdAndUpdate(userId, {
        youtubeAccessToken: credentials.access_token
      });

      return credentials.access_token;
    }

    return null;

  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
};