import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { User, IUser } from '../models/User';
import { config } from '../utils/config';
import jwt from 'jsonwebtoken';
import { STATUS_CODES, ERROR_MESSAGES } from '../utils/constants';
import { checkConnection, withTimeout, DB_TIMEOUTS, getConnectionState } from '../utils/database';

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

// Extract email safely from profile
const getEmailFromProfile = (profile: Profile): string | null => {
  if (profile.emails && profile.emails.length > 0 && profile.emails[0].value) {
    return profile.emails[0].value.toLowerCase().trim();
  }
  return null;
};

// Extract profile picture safely
const getProfilePicture = (profile: Profile): string | undefined => {
  return profile.photos?.[0]?.value;
};

// Generate username from profile
const generateUsername = (profile: Profile, email: string): string => {
  if (profile.displayName) {
    // Remove spaces and special chars, keep alphanumeric
    return profile.displayName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) || email.split('@')[0];
  }
  return email.split('@')[0];
};

// Configure Google OAuth Strategy
// NOTE: Callback URL must match the actual route path where this is mounted
// Routes: /api/auth/oauth/google/callback
passport.use(new GoogleStrategy({
  clientID: config.youtube.clientId,
  clientSecret: config.youtube.clientSecret,
  callbackURL: "/api/auth/oauth/google/callback",  // Fixed: matches route mount path
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/youtube.readonly'
  ]
}, async (accessToken: string, refreshToken: string, profile: Profile, done: any) => {
  const startTime = Date.now();
  const logPrefix = '[OAuth Strategy]';

  console.log(`${logPrefix} Processing OAuth callback for googleId:`, profile.id?.substring(0, 8) + '...');

  try {
    // Step 1: Check MongoDB connection before any DB operations
    const connCheck = await checkConnection();
    if (!connCheck.connected) {
      console.error(`${logPrefix} DB connection failed: ${connCheck.error}`);
      return done(new Error('Database temporarily unavailable. Please try again.'), null);
    }

    // Step 2: Validate profile data
    const email = getEmailFromProfile(profile);
    if (!email) {
      console.error(`${logPrefix} No email in profile. Profile keys:`, Object.keys(profile));
      return done(new Error('Email not provided by Google. Please ensure email access is granted.'), null);
    }

    console.log(`${logPrefix} Email: ${email.substring(0, 3)}***`);

    // Step 3: Check if user exists with this Google ID (with timeout)
    let user: IUser | null = null;
    try {
      user = await withTimeout(
        User.findOne({ googleId: profile.id }).exec() as Promise<IUser | null>,
        DB_TIMEOUTS.QUERY_SHORT,
        'Find user by googleId'
      );
    } catch (err: any) {
      console.error(`${logPrefix} Find by googleId failed:`, err.message);
      return done(new Error('Database query failed. Please try again.'), null);
    }

    if (user) {
      // Update existing user's tokens
      console.log(`${logPrefix} Found existing user by googleId, updating tokens`);
      try {
        user.youtubeAccessToken = accessToken;
        user.youtubeRefreshToken = refreshToken || user.youtubeRefreshToken; // Keep old refresh token if new one not provided
        user.lastLogin = new Date();

        await withTimeout(
          user.save(),
          DB_TIMEOUTS.QUERY_SHORT,
          'Update user tokens'
        );

        const duration = Date.now() - startTime;
        console.log(`${logPrefix} Existing user updated successfully (${duration}ms)`);
        return done(null, user);
      } catch (err: any) {
        console.error(`${logPrefix} Failed to update existing user:`, err.message);
        return done(new Error('Failed to update user. Please try again.'), null);
      }
    }

    // Step 4: Check if user exists with this email (with timeout)
    try {
      user = await withTimeout(
        User.findOne({ email: email }).exec() as Promise<IUser | null>,
        DB_TIMEOUTS.QUERY_SHORT,
        'Find user by email'
      );
    } catch (err: any) {
      console.error(`${logPrefix} Find by email failed:`, err.message);
      return done(new Error('Database query failed. Please try again.'), null);
    }

    if (user) {
      // Link Google account to existing user
      console.log(`${logPrefix} Found existing user by email, linking Google account`);
      try {
        user.googleId = profile.id;
        user.youtubeAccessToken = accessToken;
        user.youtubeRefreshToken = refreshToken || user.youtubeRefreshToken;
        user.lastLogin = new Date();

        // Update profile picture if user doesn't have one
        if (!user.profilePicture) {
          user.profilePicture = getProfilePicture(profile) || null;
        }

        await withTimeout(
          user.save(),
          DB_TIMEOUTS.QUERY_SHORT,
          'Link Google account'
        );

        const duration = Date.now() - startTime;
        console.log(`${logPrefix} Google account linked successfully (${duration}ms)`);
        return done(null, user);
      } catch (err: any) {
        console.error(`${logPrefix} Failed to link Google account:`, err.message);
        return done(new Error('Failed to link account. Please try again.'), null);
      }
    }

    // Step 5: Create new user
    console.log(`${logPrefix} Creating new user`);
    try {
      const username = generateUsername(profile, email);

      const newUser = new User({
        googleId: profile.id,
        email: email,
        username: username,
        profilePicture: getProfilePicture(profile),
        youtubeAccessToken: accessToken,
        youtubeRefreshToken: refreshToken,
        password: 'google-oauth', // Placeholder - won't be used for OAuth users
        lastLogin: new Date()
      });

      await withTimeout(
        newUser.save(),
        DB_TIMEOUTS.QUERY,
        'Create new user'
      );

      const duration = Date.now() - startTime;
      console.log(`${logPrefix} New user created successfully (${duration}ms)`);
      return done(null, newUser);
    } catch (err: any) {
      console.error(`${logPrefix} Failed to create new user:`, err.message);

      // Check for duplicate key error (username or email already exists)
      if (err.code === 11000) {
        console.error(`${logPrefix} Duplicate key error:`, err.keyPattern);
        return done(new Error('An account with this email or username already exists.'), null);
      }

      return done(new Error('Failed to create account. Please try again.'), null);
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} Unexpected error after ${duration}ms:`, {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
      connectionState: getConnectionState()
    });
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
    const connCheck = await checkConnection();
    if (!connCheck.connected) {
      console.error('[OAuth Deserialize] DB not connected');
      return done(new Error('Database unavailable'), null);
    }

    const user = await withTimeout(
      User.findById(id).exec(),
      DB_TIMEOUTS.QUERY_SHORT,
      'Deserialize user'
    );
    done(null, user);
  } catch (error: any) {
    console.error('[OAuth Deserialize] Error:', error.message);
    done(error, null);
  }
});

// OAuth Controllers
export const googleAuth = passport.authenticate('google', {
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/youtube.readonly'
  ]
});

export const googleCallback = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const logPrefix = '[OAuth Callback]';

  console.log(`${logPrefix} Processing callback...`);

  passport.authenticate('google', { session: false }, async (err: any, user: IUser) => {
    const duration = Date.now() - startTime;

    try {
      if (err) {
        console.error(`${logPrefix} Auth error after ${duration}ms:`, {
          message: err.message,
          name: err.name
        });

        // Provide more specific error messages
        let errorCode = 'oauth_error';
        if (err.message?.includes('Database')) {
          errorCode = 'database_error';
        } else if (err.message?.includes('timeout')) {
          errorCode = 'timeout_error';
        } else if (err.message?.includes('email')) {
          errorCode = 'email_required';
        }

        return res.redirect(`${config.frontend.url}/auth/error?message=${errorCode}&details=${encodeURIComponent(err.message || 'Unknown error')}`);
      }

      if (!user) {
        console.error(`${logPrefix} No user returned after ${duration}ms`);
        return res.redirect(`${config.frontend.url}/auth/error?message=user_not_found`);
      }

      // Generate JWT token
      const token = generateToken(user._id.toString());

      console.log(`${logPrefix} Success after ${duration}ms, redirecting with token`);

      // Redirect to frontend with token
      res.redirect(`${config.frontend.url}/auth/success?token=${token}`);

    } catch (error: any) {
      console.error(`${logPrefix} Unexpected callback error after ${duration}ms:`, {
        message: error?.message,
        stack: error?.stack?.split('\n').slice(0, 3).join('\n')
      });
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
  const startTime = Date.now();
  const logPrefix = '[YouTube Profile]';

  try {
    const user = (req as any).user as IUser;

    if (!user.youtubeAccessToken) {
      console.log(`${logPrefix} No access token for user`);
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

    // Add timeout for YouTube API call
    const channelResponse = await withTimeout(
      youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true
      }),
      DB_TIMEOUTS.OVERALL,
      'YouTube API call'
    ) as { data: { items?: any[] } };

    const channel = channelResponse.data.items?.[0];

    if (!channel) {
      console.log(`${logPrefix} No channel found for user`);
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'YouTube channel not found'
      });
    }

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} Retrieved channel info (${duration}ms)`);

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

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} Error after ${duration}ms:`, {
      message: error?.message,
      name: error?.name,
      code: error?.code
    });

    // Handle specific errors
    if (error?.message?.includes('timed out')) {
      return res.status(504).json({
        success: false,
        error: 'YouTube API timeout. Please try again.'
      });
    }

    if (error?.code === 401 || error?.message?.includes('invalid_grant')) {
      return res.status(401).json({
        success: false,
        error: 'YouTube access expired. Please reconnect your account.'
      });
    }

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Disconnect YouTube account
export const disconnectYouTube = async (req: Request, res: Response) => {
  const logPrefix = '[YouTube Disconnect]';

  try {
    const user = (req as any).user as IUser;

    // Check connection before update
    const connCheck = await checkConnection();
    if (!connCheck.connected) {
      console.error(`${logPrefix} DB not connected`);
      return res.status(connCheck.statusCode || 503).json({
        success: false,
        error: connCheck.error
      });
    }

    // Remove YouTube tokens with timeout
    await withTimeout(
      User.findByIdAndUpdate(user._id, {
        $unset: {
          youtubeAccessToken: 1,
          youtubeRefreshToken: 1,
          googleId: 1
        }
      }).exec(),
      DB_TIMEOUTS.QUERY,
      'Disconnect YouTube'
    );

    console.log(`${logPrefix} Successfully disconnected for user`);

    res.json({
      success: true,
      data: {
        message: 'YouTube account disconnected successfully'
      }
    });

  } catch (error: any) {
    console.error(`${logPrefix} Error:`, {
      message: error?.message,
      name: error?.name
    });

    if (error?.message?.includes('timed out')) {
      return res.status(504).json({
        success: false,
        error: 'Request timeout. Please try again.'
      });
    }

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Refresh YouTube access token
export const refreshYouTubeToken = async (userId: string): Promise<string | null> => {
  const logPrefix = '[YouTube Token Refresh]';

  try {
    // Check connection first
    const connCheck = await checkConnection();
    if (!connCheck.connected) {
      console.error(`${logPrefix} DB not connected`);
      return null;
    }

    const user = await withTimeout(
      User.findById(userId).exec(),
      DB_TIMEOUTS.QUERY_SHORT,
      'Find user for token refresh'
    );

    if (!user?.youtubeRefreshToken) {
      console.log(`${logPrefix} No refresh token for user`);
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

    const result = await withTimeout(
      oauth2Client.refreshAccessToken(),
      DB_TIMEOUTS.OVERALL,
      'Refresh access token'
    ) as { credentials: { access_token?: string } };

    if (result.credentials.access_token) {
      // Update user with new access token
      await withTimeout(
        User.findByIdAndUpdate(userId, {
          youtubeAccessToken: result.credentials.access_token
        }).exec(),
        DB_TIMEOUTS.QUERY_SHORT,
        'Save refreshed token'
      );

      console.log(`${logPrefix} Token refreshed successfully`);
      return result.credentials.access_token;
    }

    return null;

  } catch (error: any) {
    console.error(`${logPrefix} Error:`, {
      message: error?.message,
      name: error?.name,
      code: error?.code
    });
    return null;
  }
};
