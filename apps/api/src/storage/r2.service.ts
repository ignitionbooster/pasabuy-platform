import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 speaks the S3 API, so the regular AWS SDK works unmodified —
// just point endpoint at the R2 account URL and use R2 credentials.
@Injectable()
export class R2Service {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>("R2_BUCKET") ?? "sakay-uploads";
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.get<string>("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.get<string>("R2_ACCESS_KEY_ID") ?? "",
        secretAccessKey: config.get<string>("R2_SECRET_ACCESS_KEY") ?? "",
      },
    });
  }

  async uploadBuffer(key: string, body: Buffer, contentType: string) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
    return { key };
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 3600) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: expiresInSeconds });
  }
}
