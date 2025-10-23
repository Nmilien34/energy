import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../utils/config';
import { Readable } from 'stream';

export interface S3UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

export interface S3AudioMetadata {
  youtubeId: string;
  title: string;
  artist: string;
  duration: number;
  quality: string;
  format: string;
  uploadedAt: Date;
}

class S3Service {
  private client: S3Client | null = null;
  private bucketName: string = '';
  private isEnabled: boolean = false;
  private readonly AUDIO_PREFIX = 'audio/';
  private readonly METADATA_PREFIX = 'metadata/';
  private readonly CATALOG_KEY = 'catalog/songs.json';

  constructor() {
    this.initialize();
  }

  /**
   * Initialize S3 client
   */
  private initialize(): void {
    const s3Config = config.s3;

    if (!s3Config?.accessKeyId || !s3Config?.secretAccessKey || !s3Config?.bucketName) {
      console.warn('S3 credentials not configured. S3 storage will be disabled.');
      this.isEnabled = false;
      return;
    }

    try {
      this.client = new S3Client({
        region: s3Config.region || 'us-east-1',
        credentials: {
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey
        }
      });

      this.bucketName = s3Config.bucketName;
      this.isEnabled = true;

      console.log('✓ S3 client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize S3 client:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Check if S3 is enabled and configured
   */
  isAvailable(): boolean {
    return this.isEnabled && this.client !== null;
  }

  /**
   * Build S3 key for audio file
   */
  private buildAudioKey(youtubeId: string, format: string = 'webm'): string {
    return `${this.AUDIO_PREFIX}${youtubeId}.${format}`;
  }

  /**
   * Build S3 key for metadata file
   */
  private buildMetadataKey(youtubeId: string): string {
    return `${this.METADATA_PREFIX}${youtubeId}.json`;
  }

  /**
   * Upload audio file to S3
   */
  async uploadAudio(
    youtubeId: string,
    audioStream: Readable | Buffer,
    metadata: S3AudioMetadata,
    options: S3UploadOptions = {}
  ): Promise<string | null> {
    if (!this.isAvailable()) {
      console.warn('S3 not available, skipping upload');
      return null;
    }

    try {
      const key = this.buildAudioKey(youtubeId, metadata.format);

      const upload = new Upload({
        client: this.client!,
        params: {
          Bucket: this.bucketName,
          Key: key,
          Body: audioStream,
          ContentType: options.contentType || 'audio/webm',
          Metadata: {
            youtubeId,
            title: metadata.title,
            artist: metadata.artist,
            duration: metadata.duration.toString(),
            quality: metadata.quality,
            uploadedAt: new Date().toISOString(),
            ...options.metadata
          },
          ACL: options.acl || 'private'
        }
      });

      await upload.done();

      console.log(`✓ Uploaded audio to S3: ${key}`);

      // Also upload metadata as JSON
      await this.uploadMetadata(youtubeId, metadata);

      return this.getS3Url(key);
    } catch (error) {
      console.error(`Failed to upload audio to S3 for ${youtubeId}:`, error);
      return null;
    }
  }

  /**
   * Upload metadata JSON to S3
   */
  private async uploadMetadata(youtubeId: string, metadata: S3AudioMetadata): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      const key = this.buildMetadataKey(youtubeId);
      const metadataJson = JSON.stringify(metadata, null, 2);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: metadataJson,
        ContentType: 'application/json',
        ACL: 'private'
      });

      await this.client!.send(command);
      console.log(`✓ Uploaded metadata to S3: ${key}`);
    } catch (error) {
      console.error(`Failed to upload metadata to S3 for ${youtubeId}:`, error);
    }
  }

  /**
   * Check if audio file exists in S3
   */
  async audioExists(youtubeId: string, format: string = 'webm'): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const key = this.buildAudioKey(youtubeId, format);

      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      await this.client!.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      console.error(`Error checking S3 audio existence for ${youtubeId}:`, error);
      return false;
    }
  }

  /**
   * Get signed URL for audio file (for private access)
   */
  async getAudioSignedUrl(youtubeId: string, format: string = 'webm', expiresIn: number = 21600): Promise<string | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const key = this.buildAudioKey(youtubeId, format);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const signedUrl = await getSignedUrl(this.client!, command, { expiresIn });
      return signedUrl;
    } catch (error) {
      console.error(`Failed to generate signed URL for ${youtubeId}:`, error);
      return null;
    }
  }

  /**
   * Get public URL for audio file (if bucket is public or file has public ACL)
   */
  getS3Url(key: string): string {
    const region = config.s3?.region || 'us-east-1';
    return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
  }

  /**
   * Get public audio URL
   */
  getPublicAudioUrl(youtubeId: string, format: string = 'webm'): string {
    const key = this.buildAudioKey(youtubeId, format);
    return this.getS3Url(key);
  }

  /**
   * Download audio from S3
   */
  async downloadAudio(youtubeId: string, format: string = 'webm'): Promise<Readable | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const key = this.buildAudioKey(youtubeId, format);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.client!.send(command);
      return response.Body as Readable;
    } catch (error) {
      console.error(`Failed to download audio from S3 for ${youtubeId}:`, error);
      return null;
    }
  }

  /**
   * Get metadata from S3
   */
  async getMetadata(youtubeId: string): Promise<S3AudioMetadata | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const key = this.buildMetadataKey(youtubeId);

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      });

      const response = await this.client!.send(command);
      const metadataJson = await this.streamToString(response.Body as Readable);
      return JSON.parse(metadataJson);
    } catch (error: any) {
      if (error.name !== 'NoSuchKey') {
        console.error(`Failed to get metadata from S3 for ${youtubeId}:`, error);
      }
      return null;
    }
  }

  /**
   * Delete audio file from S3
   */
  async deleteAudio(youtubeId: string, format: string = 'webm'): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const audioKey = this.buildAudioKey(youtubeId, format);
      const metadataKey = this.buildMetadataKey(youtubeId);

      // Delete both audio and metadata
      await Promise.all([
        this.client!.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: audioKey
        })),
        this.client!.send(new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: metadataKey
        }))
      ]);

      console.log(`✓ Deleted audio and metadata from S3: ${youtubeId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete audio from S3 for ${youtubeId}:`, error);
      return false;
    }
  }

  /**
   * Update song catalog (index of all songs in S3)
   */
  async updateCatalog(songs: Array<{ youtubeId: string; title: string; artist: string; format: string }>): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const catalog = {
        updatedAt: new Date().toISOString(),
        totalSongs: songs.length,
        songs
      };

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: this.CATALOG_KEY,
        Body: JSON.stringify(catalog, null, 2),
        ContentType: 'application/json',
        ACL: 'private'
      });

      await this.client!.send(command);
      console.log(`✓ Updated song catalog with ${songs.length} songs`);
      return true;
    } catch (error) {
      console.error('Failed to update song catalog:', error);
      return false;
    }
  }

  /**
   * Get song catalog from S3
   */
  async getCatalog(): Promise<{
    updatedAt: string;
    totalSongs: number;
    songs: Array<{ youtubeId: string; title: string; artist: string; format: string }>;
  } | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: this.CATALOG_KEY
      });

      const response = await this.client!.send(command);
      const catalogJson = await this.streamToString(response.Body as Readable);
      return JSON.parse(catalogJson);
    } catch (error: any) {
      if (error.name !== 'NoSuchKey') {
        console.error('Failed to get song catalog:', error);
      }
      return null;
    }
  }

  /**
   * Helper: Convert stream to string
   */
  private async streamToString(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  /**
   * Get S3 storage statistics
   */
  async getStats(): Promise<{
    isEnabled: boolean;
    bucketName: string;
    audioCount?: number;
  }> {
    return {
      isEnabled: this.isEnabled,
      bucketName: this.bucketName
    };
  }
}

export const s3Service = new S3Service();
