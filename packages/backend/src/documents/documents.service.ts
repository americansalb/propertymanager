import {
  Injectable,
  Inject,
  LoggerService,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, type UploadedFile } from '../storage/storage.service';

type DocumentType =
  | 'LEASE_AGREEMENT'
  | 'LEASE_ADDENDUM'
  | 'MOVE_IN_CHECKLIST'
  | 'MOVE_OUT_CHECKLIST'
  | 'VENDOR_INSURANCE'
  | 'VENDOR_W9'
  | 'VENDOR_LICENSE'
  | 'VENDOR_CONTRACT'
  | 'WORK_ORDER_PHOTO'
  | 'WORK_ORDER_INVOICE'
  | 'MAINTENANCE_PHOTO'
  | 'PROPERTY_PHOTO'
  | 'UNIT_PHOTO'
  | 'OTHER';

export interface UploadDocumentDto {
  file: UploadedFile;
  entityType: string;
  entityId: string;
  type?: DocumentType;
  description?: string;
  isPublic?: boolean;
}

export interface DocumentQueryDto {
  entityType?: string;
  entityId?: string;
  type?: DocumentType;
  page?: number;
  limit?: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private storageService: StorageService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  /**
   * Upload a document
   */
  async uploadDocument(dto: UploadDocumentDto, organizationId: string, uploadedById: string) {
    // Validate entity exists and belongs to organization
    await this.validateEntity(dto.entityType, dto.entityId, organizationId);

    // Upload file to storage
    const storageResult = await this.storageService.uploadFile(
      dto.file,
      organizationId,
      dto.entityType,
      dto.entityId,
    );

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        name: dto.file.originalname,
        description: dto.description,
        type: dto.type || 'OTHER',
        storageKey: storageResult.key,
        storageUrl: storageResult.url,
        storageProvider: storageResult.provider,
        mimeType: storageResult.contentType,
        size: storageResult.size,
        entityType: dto.entityType,
        entityId: dto.entityId,
        isPublic: dto.isPublic || false,
        organizationId,
        uploadedById,
      },
    });

    this.logger.log({
      message: 'document.uploaded',
      documentId: document.id,
      entityType: dto.entityType,
      entityId: dto.entityId,
      size: storageResult.size,
    });

    return document;
  }

  /**
   * Get documents by entity
   */
  async getDocumentsByEntity(entityType: string, entityId: string, organizationId: string) {
    return this.prisma.document.findMany({
      where: {
        entityType,
        entityId,
        organizationId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get documents with pagination and filtering
   */
  async getDocuments(organizationId: string, query: DocumentQueryDto) {
    const { entityType, entityId, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      organizationId,
      deletedAt: null,
      ...(entityType && { entityType }),
      ...(entityId && { entityId }),
      ...(type && { type }),
    };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single document by ID
   */
  async getDocumentById(documentId: string, organizationId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  /**
   * Get a signed download URL for a document
   */
  async getDownloadUrl(documentId: string, organizationId: string): Promise<string> {
    const document = await this.getDocumentById(documentId, organizationId);
    return this.storageService.getSignedUrl(document.storageKey);
  }

  /**
   * Get file content for download
   */
  async getFileContent(storageKey: string, organizationId: string) {
    // Verify document belongs to organization
    const document = await this.prisma.document.findFirst({
      where: {
        storageKey,
        organizationId,
        deletedAt: null,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const content = await this.storageService.getFileContent(storageKey);

    if (!content) {
      throw new NotFoundException('File not found in storage');
    }

    return {
      ...content,
      filename: document.name,
    };
  }

  /**
   * Update document metadata
   */
  async updateDocument(
    documentId: string,
    organizationId: string,
    data: { description?: string; type?: DocumentType; isPublic?: boolean },
  ) {
    const document = await this.getDocumentById(documentId, organizationId);

    return this.prisma.document.update({
      where: { id: document.id },
      data,
    });
  }

  /**
   * Soft delete a document
   */
  async deleteDocument(documentId: string, organizationId: string) {
    const document = await this.getDocumentById(documentId, organizationId);

    // Soft delete in database
    await this.prisma.document.update({
      where: { id: document.id },
      data: { deletedAt: new Date() },
    });

    // Optionally delete from storage (or keep for recovery)
    // await this.storageService.deleteFile(document.storageKey);

    this.logger.log({
      message: 'document.deleted',
      documentId,
    });

    return { success: true };
  }

  /**
   * Permanently delete a document (including from storage)
   */
  async permanentlyDeleteDocument(documentId: string, organizationId: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete from storage
    await this.storageService.deleteFile(document.storageKey);

    // Delete from database
    await this.prisma.document.delete({
      where: { id: document.id },
    });

    this.logger.log({
      message: 'document.permanently_deleted',
      documentId,
    });

    return { success: true };
  }

  /**
   * Validate that an entity exists and belongs to the organization
   */
  private async validateEntity(
    entityType: string,
    entityId: string,
    organizationId: string,
  ): Promise<void> {
    let exists = false;

    switch (entityType.toLowerCase()) {
      case 'property': {
        const property = await this.prisma.property.findFirst({
          where: { id: entityId, organizationId },
        });
        exists = !!property;
        break;
      }

      case 'unit': {
        const unit = await this.prisma.unit.findFirst({
          where: { id: entityId },
          include: { property: true },
        });
        exists = !!unit && unit.property.organizationId === organizationId;
        break;
      }

      case 'lease': {
        const lease = await this.prisma.lease.findFirst({
          where: { id: entityId },
          include: { unit: { include: { property: true } } },
        });
        exists = !!lease && lease.unit.property.organizationId === organizationId;
        break;
      }

      case 'vendor': {
        const vendor = await this.prisma.vendor.findFirst({
          where: { id: entityId, organizationId },
        });
        exists = !!vendor;
        break;
      }

      case 'workorder': {
        const workOrder = await this.prisma.workOrder.findFirst({
          where: { id: entityId, organizationId },
        });
        exists = !!workOrder;
        break;
      }

      case 'tenant': {
        const tenant = await this.prisma.tenant.findFirst({
          where: { id: entityId },
          include: {
            unit: { include: { property: true } },
            lease: { include: { unit: { include: { property: true } } } },
          },
        });
        exists =
          !!tenant &&
          (tenant.unit?.property?.organizationId === organizationId ||
            tenant.lease?.unit?.property?.organizationId === organizationId);
        break;
      }

      case 'maintenancerequest': {
        const request = await this.prisma.maintenanceRequest.findFirst({
          where: { id: entityId },
          include: {
            tenant: {
              include: {
                unit: { include: { property: true } },
                lease: { include: { unit: { include: { property: true } } } },
              },
            },
          },
        });
        exists =
          !!request &&
          (request.tenant?.unit?.property?.organizationId === organizationId ||
            request.tenant?.lease?.unit?.property?.organizationId === organizationId);
        break;
      }

      default:
        throw new BadRequestException(`Invalid entity type: ${entityType}`);
    }

    if (!exists) {
      throw new NotFoundException(`${entityType} not found or access denied`);
    }
  }

  /**
   * Get document count by entity
   */
  async getDocumentCountByEntity(
    entityType: string,
    entityId: string,
    organizationId: string,
  ): Promise<number> {
    return this.prisma.document.count({
      where: {
        entityType,
        entityId,
        organizationId,
        deletedAt: null,
      },
    });
  }

  /**
   * Get storage statistics for organization
   */
  async getStorageStats(organizationId: string) {
    const documents = await this.prisma.document.findMany({
      where: {
        organizationId,
        deletedAt: null,
      },
      select: { size: true, type: true },
    });

    const totalSize = documents.reduce((sum, doc) => sum + doc.size, 0);
    const documentCount = documents.length;

    // Group by type
    const byType: Record<string, { count: number; size: number }> = {};
    documents.forEach((doc) => {
      if (!byType[doc.type]) {
        byType[doc.type] = { count: 0, size: 0 };
      }
      byType[doc.type].count++;
      byType[doc.type].size += doc.size;
    });

    return {
      totalDocuments: documentCount,
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      byType,
      storageProvider: this.storageService.getProvider(),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 Bytes';
    }
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}
