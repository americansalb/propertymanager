# File Storage Service

The storage service provides a unified interface for file uploads and downloads, supporting both local filesystem storage (for development) and AWS S3 (for production).

## Features

- ✅ AWS S3 integration with SDK v3
- ✅ Local filesystem fallback for development
- ✅ Pre-signed URLs for secure downloads
- ✅ File validation (type and size)
- ✅ Automatic organization by organizationId/entityType/entityId
- ✅ Support for documents and images
- ✅ Configurable via environment variables

## Supported File Types

### Documents
- PDF (`.pdf`)
- Microsoft Word (`.doc`, `.docx`)
- Microsoft Excel (`.xls`, `.xlsx`)
- Plain text (`.txt`)
- CSV (`.csv`)

### Images
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- GIF (`.gif`)
- WebP (`.webp`)
- HEIC/HEIF (`.heic`, `.heif`)

**Max file size**: 10MB (configurable via `UPLOAD_MAX_SIZE_MB`)

## Configuration

### Option 1: Local Storage (Development)

Stores files in the local filesystem. Good for development and testing.

Add to `.env`:
```bash
STORAGE_PROVIDER="local"
STORAGE_LOCAL_PATH="./uploads"
UPLOAD_MAX_SIZE_MB=10
```

Files will be stored at `./uploads` relative to the backend directory.

### Option 2: AWS S3 (Production)

Stores files in Amazon S3. Recommended for production.

#### Step 1: Create S3 Bucket

1. **Go to AWS Console > S3**
2. **Create bucket**:
   - Bucket name: `propertymaster-production-files` (or your choice)
   - Region: `us-east-1` (or your choice)
   - Block all public access: **Enabled** (we'll use pre-signed URLs)
   - Versioning: Optional
   - Encryption: **Enable** (AES-256 or KMS)

3. **Configure CORS** (if accessing from browser):
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["https://yourdomain.com"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

4. **Configure lifecycle policy** (optional):
   - Delete soft-deleted files after 30 days
   - Move old files to Glacier after 90 days

#### Step 2: Create IAM User

1. **Go to AWS Console > IAM > Users > Add users**
2. **User name**: `propertymaster-s3-user`
3. **Permissions**:
   - Attach policy directly
   - Create custom policy:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:DeleteObject",
           "s3:HeadObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::propertymaster-production-files/*",
           "arn:aws:s3:::propertymaster-production-files"
         ]
       }
     ]
   }
   ```

4. **Create access key**:
   - Security credentials > Create access key
   - Choose "Application running outside AWS"
   - Save **Access key ID** and **Secret access key**

#### Step 3: Configure Environment Variables

Add to production `.env`:
```bash
STORAGE_PROVIDER="s3"
AWS_S3_BUCKET="propertymaster-production-files"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key-id"
AWS_SECRET_ACCESS_KEY="your-secret-access-key"
UPLOAD_MAX_SIZE_MB=10
```

## Usage

The storage service is automatically injected into the `DocumentsService` and used transparently.

### Upload a file

```typescript
// Via DocumentsService
const result = await this.documentsService.uploadDocument(
  {
    file: uploadedFile,  // From multer/multipart upload
    entityType: 'property',
    entityId: property.id,
    type: 'PROPERTY_PHOTO',
    description: 'Main property photo',
    isPublic: false,
  },
  organizationId,
  userId,
);
```

### Get download URL

```typescript
// Get a pre-signed URL (valid for 1 hour by default)
const downloadUrl = await this.documentsService.getDownloadUrl(
  documentId,
  organizationId,
);

// Returns:
// - For S3: Pre-signed URL (e.g., https://bucket.s3.amazonaws.com/key?signature=...)
// - For local: API endpoint (e.g., http://localhost:3001/api/v1/documents/download/key)
```

### Download file content

```typescript
// Get file buffer for streaming to client
const file = await this.documentsService.getFileContent(
  storageKey,
  organizationId,
);

// Returns: { buffer: Buffer, contentType: string, filename: string }
```

### Delete file

```typescript
// Soft delete (keeps in storage)
await this.documentsService.deleteDocument(documentId, organizationId);

// Permanent delete (removes from storage)
await this.documentsService.permanentlyDeleteDocument(documentId, organizationId);
```

## File Organization

Files are organized in storage using the following structure:

```
{organizationId}/{entityType}/{entityId}/{uuid}-{sanitized-filename}.ext
```

Example:
```
org_abc123/property/prop_xyz789/550e8400-e29b-41d4-a716-446655440000-main_photo.jpg
org_abc123/workorder/wo_123456/7c9e6679-7425-40de-944b-e07fc1f90ae7-invoice.pdf
```

This ensures:
- ✅ Organization-level isolation
- ✅ Entity-based grouping
- ✅ Unique filenames (UUID prevents collisions)
- ✅ Original filename preserved (for downloads)

## Security

### Access Control

- All file operations require organization validation
- Pre-signed URLs expire after 1 hour (configurable)
- S3 bucket has public access blocked
- Documents can be marked as `isPublic` for tenant access

### Validation

Files are validated on upload:
- **Size limit**: 10MB (configurable)
- **Allowed types**: Only documents and images
- **Content-Type** verification
- **Filename** sanitization (removes special characters)

### S3 Security Best Practices

1. **Encryption at rest**: Enable S3 default encryption
2. **Encryption in transit**: HTTPS only (enforced by S3)
3. **IAM permissions**: Least privilege (only necessary S3 actions)
4. **No public access**: Use pre-signed URLs instead
5. **Access logging**: Enable S3 server access logging
6. **Versioning**: Optional for file recovery

## Cost Optimization

### S3 Pricing (approximate)

- **Storage**: $0.023 per GB/month (Standard class)
- **PUT requests**: $0.005 per 1,000 requests
- **GET requests**: $0.0004 per 1,000 requests
- **Data transfer OUT**: $0.09 per GB (to internet)

### Example Cost for 10,000 documents

Assuming:
- Average file size: 500KB
- Total storage: 5GB
- 50,000 GET requests/month
- 1,000 PUT requests/month
- 10GB data transfer OUT/month

**Monthly cost**: ~$1.50

### Cost Reduction Tips

1. **Lifecycle policies**:
   - Move old files to Glacier after 90 days ($0.004/GB)
   - Delete soft-deleted files after 30 days

2. **CloudFront CDN**:
   - Cache frequently accessed files
   - Reduce S3 GET requests and data transfer costs

3. **Compression**:
   - Compress documents before upload
   - Reduces storage and transfer costs

## Monitoring

### Metrics to Track

- **Storage used**: Total GB stored
- **Request count**: PUT/GET/DELETE operations
- **Error rate**: Failed uploads/downloads
- **Cost**: Monthly S3 spend

### CloudWatch Metrics

AWS S3 automatically publishes metrics to CloudWatch:
- `BucketSizeBytes`: Total storage used
- `NumberOfObjects`: Total object count
- `4xxErrors`: Client errors
- `5xxErrors`: Server errors

### Application Logs

The storage service logs all operations via Winston:
- `storage.uploaded_to_s3`: File uploaded
- `storage.deleted_from_s3`: File deleted
- `storage.s3_get_failed`: Download failed
- `storage.s3_delete_failed`: Delete failed

## Troubleshooting

### Files not uploading to S3

1. **Check AWS credentials**:
   ```typescript
   const provider = this.storageService.getProvider();
   console.log('Storage provider:', provider); // Should be 's3'
   ```

2. **Verify IAM permissions**:
   - Test with AWS CLI: `aws s3 ls s3://your-bucket-name/`
   - Check bucket policy and CORS

3. **Check logs** for specific error messages

### Files not downloading

1. **Check pre-signed URL expiration**:
   - Default: 1 hour
   - Increase if needed: `getSignedUrl(key, 7200)` (2 hours)

2. **Verify file exists**:
   ```typescript
   const exists = await this.storageService.fileExists(key);
   ```

3. **Check CORS configuration** (if accessing from browser)

### High S3 costs

1. **Review storage usage**:
   ```typescript
   const stats = await this.documentsService.getStorageStats(organizationId);
   console.log(stats); // Total size, count by type
   ```

2. **Implement lifecycle policies**:
   - Delete soft-deleted documents permanently after 30 days
   - Move old documents to Glacier storage class

3. **Enable CloudFront CDN** for frequently accessed files

## Production Checklist

Before launching:

- [ ] Create S3 bucket with appropriate settings
- [ ] Create IAM user with minimal required permissions
- [ ] Configure environment variables in production
- [ ] Test file upload/download/delete operations
- [ ] Enable S3 encryption at rest
- [ ] Configure S3 lifecycle policies
- [ ] Set up CloudWatch alarms for errors and costs
- [ ] Enable S3 access logging
- [ ] Document backup/recovery procedures
- [ ] Test pre-signed URL expiration
- [ ] Verify CORS configuration (if needed)

## Migration from Local to S3

When moving from local storage to S3:

1. **Upload existing files to S3**:
   ```bash
   aws s3 sync ./uploads s3://your-bucket-name/
   ```

2. **Update database records**:
   ```sql
   UPDATE documents
   SET storage_provider = 's3',
       storage_url = 'https://your-bucket-name.s3.amazonaws.com/' || storage_key
   WHERE storage_provider = 'local';
   ```

3. **Update environment variable**:
   ```bash
   STORAGE_PROVIDER="s3"
   ```

4. **Restart application**

5. **Verify all files are accessible**

6. **Delete local files** (after verification)
