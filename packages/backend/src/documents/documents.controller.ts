import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';

enum DocumentType {
  LEASE_AGREEMENT = 'LEASE_AGREEMENT',
  LEASE_ADDENDUM = 'LEASE_ADDENDUM',
  MOVE_IN_CHECKLIST = 'MOVE_IN_CHECKLIST',
  MOVE_OUT_CHECKLIST = 'MOVE_OUT_CHECKLIST',
  VENDOR_INSURANCE = 'VENDOR_INSURANCE',
  VENDOR_W9 = 'VENDOR_W9',
  VENDOR_LICENSE = 'VENDOR_LICENSE',
  VENDOR_CONTRACT = 'VENDOR_CONTRACT',
  WORK_ORDER_PHOTO = 'WORK_ORDER_PHOTO',
  WORK_ORDER_INVOICE = 'WORK_ORDER_INVOICE',
  MAINTENANCE_PHOTO = 'MAINTENANCE_PHOTO',
  PROPERTY_PHOTO = 'PROPERTY_PHOTO',
  UNIT_PHOTO = 'UNIT_PHOTO',
  OTHER = 'OTHER',
}

class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

@ApiTags('documents')
@Controller('documents')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        entityType: {
          type: 'string',
          description: 'Type of entity (Property, Unit, Lease, Vendor, WorkOrder, etc.)',
        },
        entityId: {
          type: 'string',
          description: 'ID of the entity',
        },
        type: {
          type: 'string',
          enum: Object.values(DocumentType),
          description: 'Document type',
        },
        description: {
          type: 'string',
          description: 'Optional description',
        },
      },
      required: ['file', 'entityType', 'entityId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or parameters' })
  async uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /(pdf|doc|docx|xls|xlsx|txt|csv|jpg|jpeg|png|gif|webp)$/i,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
    @Body('type') type?: string,
    @Body('description') description?: string,
    @OrganizationId() organizationId?: string,
    @UserId() userId?: string,
  ) {
    const document = await this.documentsService.uploadDocument(
      {
        file: {
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          buffer: file.buffer,
          size: file.size,
        },
        entityType,
        entityId,
        type: type as DocumentType,
        description,
      },
      organizationId!,
      userId!,
    );

    return { success: true, data: document };
  }

  @Get()
  @ApiOperation({ summary: 'Get documents with pagination and filtering' })
  @ApiQuery({ name: 'entityType', required: false, description: 'Filter by entity type' })
  @ApiQuery({ name: 'entityId', required: false, description: 'Filter by entity ID' })
  @ApiQuery({ name: 'type', required: false, enum: DocumentType, description: 'Filter by document type' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async getDocuments(
    @OrganizationId() organizationId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.documentsService.getDocuments(organizationId, {
      entityType,
      entityId,
      type: type as DocumentType,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return { success: true, ...result };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get storage statistics for organization' })
  @ApiResponse({ status: 200, description: 'Storage statistics' })
  async getStorageStats(@OrganizationId() organizationId: string) {
    const stats = await this.documentsService.getStorageStats(organizationId);
    return { success: true, data: stats };
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get all documents for an entity' })
  @ApiResponse({ status: 200, description: 'List of documents for entity' })
  async getDocumentsByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @OrganizationId() organizationId: string,
  ) {
    const documents = await this.documentsService.getDocumentsByEntity(
      entityType,
      entityId,
      organizationId,
    );
    return { success: true, data: documents };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document metadata by ID' })
  @ApiResponse({ status: 200, description: 'Document metadata' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    const document = await this.documentsService.getDocumentById(id, organizationId);
    return { success: true, data: document };
  }

  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get a signed download URL for a document' })
  @ApiResponse({ status: 200, description: 'Signed download URL' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDownloadUrl(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    const url = await this.documentsService.getDownloadUrl(id, organizationId);
    return { success: true, data: { url } };
  }

  @Get('download/:key(*)')
  @ApiOperation({ summary: 'Download a document by storage key (for local storage)' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('key') key: string,
    @OrganizationId() organizationId: string,
    @Res() res: Response,
  ) {
    const { buffer, contentType, filename } = await this.documentsService.getFileContent(
      key,
      organizationId,
    );

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update document metadata' })
  @ApiResponse({ status: 200, description: 'Document updated' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @OrganizationId() organizationId: string,
  ) {
    const document = await this.documentsService.updateDocument(id, organizationId, dto);
    return { success: true, data: document };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete a document' })
  @ApiResponse({ status: 200, description: 'Document deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    const result = await this.documentsService.deleteDocument(id, organizationId);
    return { success: true, data: result };
  }

  @Delete(':id/permanent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Permanently delete a document (including from storage)' })
  @ApiResponse({ status: 200, description: 'Document permanently deleted' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async permanentlyDeleteDocument(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
  ) {
    const result = await this.documentsService.permanentlyDeleteDocument(id, organizationId);
    return { success: true, data: result };
  }
}
