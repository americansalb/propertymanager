import { Injectable, Inject, LoggerService, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface StorageResult {
  key: string;
  url: string;
  bucket?: string;
  provider: 'local' | 's3';
  size: number;
  contentType: string;
}

type StorageProvider = 'local' | 's3';

// Allowed file types for upload
const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

@Injectable()
export class StorageService {
  private readonly provider: StorageProvider;
  private readonly s3Client: S3Client | null = null;
  private readonly s3Bucket: string;
  private readonly localStoragePath: string;
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    // Determine storage provider
    const providerConfig = this.configService.get<string>('STORAGE_PROVIDER') || 'local';
    this.provider = providerConfig === 's3' ? 's3' : 'local';

    // S3 Configuration
    this.s3Bucket = this.configService.get<string>('AWS_S3_BUCKET') || '';
    const region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    if (this.provider === 's3' && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.logger.log({
        message: 'storage.s3_initialized',
        bucket: this.s3Bucket,
        region,
      });
    } else if (this.provider === 's3') {
      this.logger.warn({
        message: 'storage.s3_config_incomplete',
        hint: 'Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for S3 storage',
      });
      // Fall back to local
      this.provider = 'local';
    }

    // Local storage configuration
    this.localStoragePath = this.configService.get<string>('LOCAL_STORAGE_PATH') ||
                            path.join(process.cwd(), 'uploads');
    this.baseUrl = this.configService.get<string>('API_BASE_URL') || 'http://localhost:3001';

    // Ensure local storage directory exists
    if (this.provider === 'local') {
      this.ensureLocalStorageDir();
    }

    this.logger.log({
      message: 'storage.initialized',
      provider: this.provider,
    });
  }

  private ensureLocalStorageDir(): void {
    if (!fs.existsSync(this.localStoragePath)) {
      fs.mkdirSync(this.localStoragePath, { recursive: true });
    }
  }

  /**
   * Get the current storage provider
   */
  getProvider(): StorageProvider {
    return this.provider;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: UploadedFile): void {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      );
    }

    // Check mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: PDF, Word, Excel, images`
      );
    }
  }

  /**
   * Generate a unique storage key for a file
   */
  generateKey(
    organizationId: string,
    entityType: string,
    entityId: string,
    originalFilename: string,
  ): string {
    const uuid = uuidv4();
    const ext = path.extname(originalFilename);
    const sanitizedName = path.basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);

    return `${organizationId}/${entityType}/${entityId}/${uuid}-${sanitizedName}${ext}`;
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    file: UploadedFile,
    organizationId: string,
    entityType: string,
    entityId: string,
  ): Promise<StorageResult> {
    // Validate file
    this.validateFile(file);

    // Generate unique key
    const key = this.generateKey(organizationId, entityType, entityId, file.originalname);

    if (this.provider === 's3' && this.s3Client) {
      return this.uploadToS3(file, key);
    } else {
      return this.uploadToLocal(file, key);
    }
  }

  /**
   * Upload to S3
   */
  private async uploadToS3(file: UploadedFile, key: string): Promise<StorageResult> {
    const command = new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ContentDisposition: `inline; filename="${file.originalname}"`,
    });

    await this.s3Client!.send(command);

    const url = `https://${this.s3Bucket}.s3.amazonaws.com/${key}`;

    this.logger.log({
      message: 'storage.uploaded_to_s3',
      key,
      size: file.size,
      contentType: file.mimetype,
    });

    return {
      key,
      url,
      bucket: this.s3Bucket,
      provider: 's3',
      size: file.size,
      contentType: file.mimetype,
    };
  }

  /**
   * Upload to local filesystem
   */
  private async uploadToLocal(file: UploadedFile, key: string): Promise<StorageResult> {
    const filePath = path.join(this.localStoragePath, key);
    const dirPath = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, file.buffer);

    const url = `${this.baseUrl}/api/v1/documents/download/${encodeURIComponent(key)}`;

    this.logger.log({
      message: 'storage.uploaded_to_local',
      key,
      path: filePath,
      size: file.size,
    });

    return {
      key,
      url,
      provider: 'local',
      size: file.size,
      contentType: file.mimetype,
    };
  }

  /**
   * Get a signed URL for downloading a file
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (this.provider === 's3' && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });
      return getSignedUrl(this.s3Client, command, { expiresIn });
    } else {
      // For local storage, return direct URL (auth handled by controller)
      return `${this.baseUrl}/api/v1/documents/download/${encodeURIComponent(key)}`;
    }
  }

  /**
   * Get file content (for local storage download endpoint)
   */
  async getFileContent(key: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (this.provider === 'local') {
      const filePath = path.join(this.localStoragePath, key);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(key).toLowerCase();
      const contentType = this.getContentTypeFromExtension(ext);

      return { buffer, contentType };
    } else if (this.provider === 's3' && this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        });
        const response = await this.s3Client.send(command);

        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        return {
          buffer,
          contentType: response.ContentType || 'application/octet-stream',
        };
      } catch (error) {
        this.logger.error({
          message: 'storage.s3_get_failed',
          key,
          error: (error as Error).message,
        });
        return null;
      }
    }
    return null;
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<boolean> {
    if (this.provider === 's3' && this.s3Client) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        });
        await this.s3Client.send(command);

        this.logger.log({
          message: 'storage.deleted_from_s3',
          key,
        });
        return true;
      } catch (error) {
        this.logger.error({
          message: 'storage.s3_delete_failed',
          key,
          error: (error as Error).message,
        });
        return false;
      }
    } else {
      try {
        const filePath = path.join(this.localStoragePath, key);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          this.logger.log({
            message: 'storage.deleted_from_local',
            key,
          });
          return true;
        }
        return false;
      } catch (error) {
        this.logger.error({
          message: 'storage.local_delete_failed',
          key,
          error: (error as Error).message,
        });
        return false;
      }
    }
  }

  /**
   * Check if a file exists
   */
  async fileExists(key: string): Promise<boolean> {
    if (this.provider === 's3' && this.s3Client) {
      try {
        const command = new HeadObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        });
        await this.s3Client.send(command);
        return true;
      } catch {
        return false;
      }
    } else {
      const filePath = path.join(this.localStoragePath, key);
      return fs.existsSync(filePath);
    }
  }

  /**
   * Get content type from file extension
   */
  private getContentTypeFromExtension(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}
