import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IGlobalPlayLog extends Document {
    songId: string;       // YouTube ID
    artist: string;       // Artist name (or Channel Title)
    channelId?: string;   // YouTube Channel ID (ideal for grouping)
    userId?: Types.ObjectId; // Optional: who played it
    timestamp: Date;
}

const globalPlayLogSchema = new Schema<IGlobalPlayLog>({
    songId: {
        type: String,
        required: true,
        index: true
    },
    artist: {
        type: String,
        required: true,
        index: true
    },
    channelId: {
        type: String,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: { createdAt: true, updatedAt: false } // Only need createdAt
});

// TTL Index: Delete logs older than 30 days to keep DB size manageable
// We only need 48 hours for the trending feature, but 30 days is good for monthly analytics if needed later.
globalPlayLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound index for aggregation performance
globalPlayLogSchema.index({ timestamp: 1, channelId: 1 });

export const GlobalPlayLog = mongoose.model<IGlobalPlayLog>('GlobalPlayLog', globalPlayLogSchema);
