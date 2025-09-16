import { Request, Response } from 'express';
import { settingsService } from '../services/settingsService';
import { STATUS_CODES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants';
import { IUser } from '../models/User';
import {
  notificationSettingsSchema,
  privacySettingsSchema,
  audioSettingsSchema,
  appearanceSettingsSchema,
  playbackSettingsSchema,
  socialSettingsSchema,
  profileSettingsSchema,
  passwordChangeSchema,
  accountDeletionSchema
} from '../validators/settingsValidators';

// Get all user settings
export const getUserSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const settings = await settingsService.getUserSettings(user._id.toString());

    res.json({
      success: true,
      data: { settings }
    });

  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Update notification settings
export const updateNotificationSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const validation = notificationSettingsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid notification settings',
        details: validation.error.errors
      });
    }

    const settings = await settingsService.updateNotificationSettings(
      user._id.toString(),
      validation.data
    );

    res.json({
      success: true,
      data: { settings },
      message: 'Notification settings updated successfully'
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Update privacy settings
export const updatePrivacySettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const validation = privacySettingsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid privacy settings',
        details: validation.error.errors
      });
    }

    const settings = await settingsService.updatePrivacySettings(
      user._id.toString(),
      validation.data
    );

    res.json({
      success: true,
      data: { settings },
      message: 'Privacy settings updated successfully'
    });

  } catch (error) {
    console.error('Update privacy settings error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Update audio settings
export const updateAudioSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const validation = audioSettingsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid audio settings',
        details: validation.error.errors
      });
    }

    const settings = await settingsService.updateAudioSettings(
      user._id.toString(),
      validation.data
    );

    res.json({
      success: true,
      data: { settings },
      message: 'Audio settings updated successfully'
    });

  } catch (error) {
    console.error('Update audio settings error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Update appearance settings
export const updateAppearanceSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const validation = appearanceSettingsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid appearance settings',
        details: validation.error.errors
      });
    }

    const settings = await settingsService.updateAppearanceSettings(
      user._id.toString(),
      validation.data
    );

    res.json({
      success: true,
      data: { settings },
      message: 'Appearance settings updated successfully'
    });

  } catch (error) {
    console.error('Update appearance settings error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Update playback settings
export const updatePlaybackSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const validation = playbackSettingsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid playback settings',
        details: validation.error.errors
      });
    }

    const settings = await settingsService.updatePlaybackSettings(
      user._id.toString(),
      validation.data
    );

    res.json({
      success: true,
      data: { settings },
      message: 'Playback settings updated successfully'
    });

  } catch (error) {
    console.error('Update playback settings error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Update social settings
export const updateSocialSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const validation = socialSettingsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid social settings',
        details: validation.error.errors
      });
    }

    const settings = await settingsService.updateSocialSettings(
      user._id.toString(),
      validation.data
    );

    res.json({
      success: true,
      data: { settings },
      message: 'Social settings updated successfully'
    });

  } catch (error) {
    console.error('Update social settings error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const validation = profileSettingsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid profile data',
        details: validation.error.errors
      });
    }

    const updatedUser = await settingsService.updateUserProfile(
      user._id.toString(),
      validation.data
    );

    res.json({
      success: true,
      data: { user: updatedUser },
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Update profile error:', error);

    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const validation = passwordChangeSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid password data',
        details: validation.error.errors
      });
    }

    const { currentPassword, newPassword } = validation.data;

    await settingsService.changePassword(
      user._id.toString(),
      currentPassword,
      newPassword
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);

    if (error instanceof Error) {
      if (error.message === 'Current password is incorrect') {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      if (error.message === 'User not found') {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Delete account
export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const validation = accountDeletionSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(STATUS_CODES.BAD_REQUEST).json({
        success: false,
        error: 'Invalid deletion request',
        details: validation.error.errors
      });
    }

    const { password } = validation.data;

    await settingsService.deleteUserAccount(user._id.toString(), password);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);

    if (error instanceof Error) {
      if (error.message === 'Password is incorrect') {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          error: 'Password is incorrect'
        });
      }

      if (error.message === 'User not found') {
        return res.status(STATUS_CODES.NOT_FOUND).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Get equalizer presets
export const getEqualizerPresets = async (req: Request, res: Response) => {
  try {
    const presets = await settingsService.getEqualizerPresets();

    res.json({
      success: true,
      data: { presets }
    });

  } catch (error) {
    console.error('Get equalizer presets error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Get available themes
export const getAvailableThemes = async (req: Request, res: Response) => {
  try {
    const themes = await settingsService.getAvailableThemes();

    res.json({
      success: true,
      data: { themes }
    });

  } catch (error) {
    console.error('Get available themes error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Get available accent colors
export const getAvailableAccentColors = async (req: Request, res: Response) => {
  try {
    const colors = await settingsService.getAvailableAccentColors();

    res.json({
      success: true,
      data: { colors }
    });

  } catch (error) {
    console.error('Get available accent colors error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Reset settings
export const resetSettings = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const { category } = req.body;

    const settings = await settingsService.resetSettings(
      user._id.toString(),
      category
    );

    res.json({
      success: true,
      data: { settings },
      message: category
        ? `${category} settings reset to default`
        : 'All settings reset to default'
    });

  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};

// Export user data
export const exportUserData = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as IUser;
    const userData = await settingsService.exportUserData(user._id.toString());

    res.json({
      success: true,
      data: userData,
      message: 'User data exported successfully'
    });

  } catch (error) {
    console.error('Export user data error:', error);

    if (error instanceof Error && error.message === 'User not found') {
      return res.status(STATUS_CODES.NOT_FOUND).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: ERROR_MESSAGES.INTERNAL_ERROR
    });
  }
};