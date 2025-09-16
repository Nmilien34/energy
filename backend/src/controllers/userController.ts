import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { UserLibrary } from '../models/UserLibrary';
import { generateToken } from '../middleware/auth';
import { STATUS_CODES, ERROR_MESSAGES } from '../utils/constants';



export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User already exists with this email or username'
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      username
    });

    await user.save();
    
    // Generate token
    const token = generateToken(user._id.toString());

    res.status(201).json({ user, token });
  } catch (error) {
    res.status(400).json({
      error: 'Error creating user'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid login credentials'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Invalid login credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    res.json({ user, token });
  } catch (error) {
    res.status(400).json({
      error: 'Error logging in'
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById((req as any).user?._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching profile'
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { username, email } = req.body;
    const updates: Partial<IUser> = {};

    if (username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ username, _id: { $ne: (req as any).user?._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken'
        });
      }
      updates.username = username;
    }

    if (email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email, _id: { $ne: (req as any).user?._id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already taken'
        });
      }
      updates.email = email;
    }

    const user = await User.findByIdAndUpdate(
      (req as any).user?._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating profile'
    });
  }
};

// Get user library
export const getUserLibrary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    let library = await UserLibrary.findOne({ user: userId })
      .populate('favoriteSongs')
      .populate('favoritePlaylists')
      .populate('recentlyPlayed.song')
      .populate('listeningHistory.song');

    // Create library if it doesn't exist
    if (!library) {
      library = new UserLibrary({
        user: userId,
        favoriteSongs: [],
        favoritePlaylists: [],
        recentlyPlayed: [],
        listeningHistory: [],
        preferences: {
          autoplay: true,
          shuffle: false,
          repeat: 'none',
          volume: 80,
          quality: 'medium',
          crossfade: 0
        },
        followedArtists: [],
        blockedSongs: []
      });
      await library.save();

      // Populate after saving
      library = await UserLibrary.findById(library._id)
        .populate('favoriteSongs')
        .populate('favoritePlaylists')
        .populate('recentlyPlayed.song')
        .populate('listeningHistory.song');
    }

    res.json({
      success: true,
      data: { library }
    });

  } catch (error) {
    console.error('Get user library error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Get recently played songs
export const getRecentlyPlayed = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const library = await UserLibrary.findOne({ user: userId })
      .populate('recentlyPlayed.song')
      .select('recentlyPlayed');

    if (!library) {
      return res.json({
        success: true,
        data: { recentlyPlayed: [] }
      });
    }

    // Sort by playedAt in descending order and limit to recent items
    const recentlyPlayed = library.recentlyPlayed
      .sort((a: any, b: any) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
      .slice(0, 20);

    res.json({
      success: true,
      data: { recentlyPlayed }
    });

  } catch (error) {
    console.error('Get recently played error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Get favorite songs
export const getFavoriteSongs = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    if (!userId) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const library = await UserLibrary.findOne({ user: userId })
      .populate('favoriteSongs')
      .select('favoriteSongs');

    if (!library) {
      return res.json({
        success: true,
        data: { favoriteSongs: [] }
      });
    }

    res.json({
      success: true,
      data: { favoriteSongs: library.favoriteSongs }
    });

  } catch (error) {
    console.error('Get favorite songs error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Add song to favorites
export const addToFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { songId } = req.body;

    if (!userId) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!songId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Song ID is required'
      });
    }

    let library = await UserLibrary.findOne({ user: userId });
    if (!library) {
      library = new UserLibrary({ user: userId });
      await library.save();
    }

    await library.addToFavorites(songId);

    res.json({
      success: true,
      message: 'Song added to favorites'
    });

  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Remove song from favorites
export const removeFromFavorites = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { songId } = req.body;

    if (!userId) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!songId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Song ID is required'
      });
    }

    const library = await UserLibrary.findOne({ user: userId });
    if (!library) {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'User library not found'
      });
    }

    await library.removeFromFavorites(songId);

    res.json({
      success: true,
      message: 'Song removed from favorites'
    });

  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Add song to recently played
export const addToRecentlyPlayed = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { songId } = req.body;

    if (!userId) {
      return res.status(STATUS_CODES.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!songId) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Song ID is required'
      });
    }

    let library = await UserLibrary.findOne({ user: userId });
    if (!library) {
      library = new UserLibrary({ user: userId });
      await library.save();
    }

    await library.addToRecentlyPlayed(songId);

    res.json({
      success: true,
      message: 'Song added to recently played'
    });

  } catch (error) {
    console.error('Add to recently played error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
}; 