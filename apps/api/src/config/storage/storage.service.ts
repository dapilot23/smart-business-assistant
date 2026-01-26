import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export type StorageProvider = 's3' | 'local';

export interface UploadResult {
  key: string;
  url: string;
  provider: StorageProvider;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: StorageProvider;
  private readonly s3Client: S3Client | null = null;
  private readonly bucket: string;
  private readonly localPath: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.provider =
      (configService.get<string>('STORAGE_PROVIDER') as StorageProvider) ||
      'local';
    this.bucket = configService.get<string>('AWS_S3_BUCKET') || '';
    this.localPath =
      configService.get<string>('STORAGE_LOCAL_PATH') || './uploads';
    this.baseUrl = configService.get<string>('API_BASE_URL') || '';

    if (this.provider === 's3' && this.bucket) {
      this.s3Client = new S3Client({
        region: configService.get<string>('AWS_REGION') || 'us-east-1',
        credentials: {
          accessKeyId: configService.get<string>('AWS_ACCESS_KEY_ID') || '',
          secretAccessKey:
            configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
        },
      });
      this.logger.log('S3 storage initialized');
    } else {
      this.logger.log('Using local file storage');
      this.ensureLocalDirectory();
    }
  }

  private ensureLocalDirectory() {
    if (!fs.existsSync(this.localPath)) {
      fs.mkdirSync(this.localPath, { recursive: true });
    }
  }

  async upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    folder = 'uploads',
  ): Promise<UploadResult> {
    const ext = path.extname(filename);
    const key = `${folder}/${uuidv4()}${ext}`;

    if (this.provider === 's3' && this.s3Client) {
      return this.uploadToS3(buffer, key, mimeType);
    }

    return this.uploadToLocal(buffer, key);
  }

  private async uploadToS3(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });

    await this.s3Client!.send(command);

    const url = await this.getSignedUrl(key);
    return { key, url, provider: 's3' };
  }

  private async uploadToLocal(
    buffer: Buffer,
    key: string,
  ): Promise<UploadResult> {
    const filePath = path.join(this.localPath, key);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);

    const url = `${this.baseUrl}/uploads/${key}`;
    return { key, url, provider: 'local' };
  }

  async delete(key: string): Promise<void> {
    if (this.provider === 's3' && this.s3Client) {
      await this.deleteFromS3(key);
    } else {
      this.deleteFromLocal(key);
    }
  }

  private async deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3Client!.send(command);
  }

  private deleteFromLocal(key: string): void {
    const filePath = path.join(this.localPath, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.provider === 's3' && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      return getSignedUrl(this.s3Client, command, { expiresIn });
    }

    return `${this.baseUrl}/uploads/${key}`;
  }

  getProvider(): StorageProvider {
    return this.provider;
  }
}
