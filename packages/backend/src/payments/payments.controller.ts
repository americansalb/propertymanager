import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';
import {
  RecordPaymentDto,
  CreatePaymentIntentDto,
  RefundPaymentDto,
} from '../financial/dto/payment.dto';

@ApiTags('payments')
@Controller('payments')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiQuery({ name: 'tenantId', required: false, description: 'Filter by tenant' })
  @ApiQuery({ name: 'leaseId', required: false, description: 'Filter by lease' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'List of payments' })
  async findAll(
    @OrganizationId() organizationId: string,
    @Query('tenantId') tenantId?: string,
    @Query('leaseId') leaseId?: string,
    @Query('status') status?: string,
  ) {
    const payments = await this.paymentsService.findAll(organizationId, {
      tenantId,
      leaseId,
      status,
    });
    return { success: true, data: payments };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single payment by ID' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment details' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async findOne(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const payment = await this.paymentsService.findOne(id, organizationId);
    return { success: true, data: payment };
  }

  @Post('record')
  @ApiOperation({ summary: 'Record a manual payment (cash, check, etc.)' })
  @ApiResponse({ status: 201, description: 'Payment recorded successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async recordPayment(
    @Body() dto: RecordPaymentDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const payment = await this.paymentsService.recordPayment(dto, organizationId, userId);
    return { success: true, data: payment, message: 'Payment recorded successfully' };
  }

  @Post('create-intent')
  @ApiOperation({ summary: 'Create a Stripe payment intent for online payment' })
  @ApiResponse({ status: 201, description: 'Payment intent created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Tenant not found' })
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const result = await this.paymentsService.createPaymentIntent(dto, organizationId, userId);
    return { success: true, data: result };
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund a payment (partial or full)' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment refunded successfully' })
  @ApiResponse({ status: 400, description: 'Cannot refund payment in current status' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async refundPayment(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const payment = await this.paymentsService.refundPayment(id, dto, organizationId, userId);
    return { success: true, data: payment, message: 'Payment refunded successfully' };
  }

  @Post(':id/void')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Void a pending payment' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment voided successfully' })
  @ApiResponse({ status: 400, description: 'Cannot void payment in current status' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async voidPayment(
    @Param('id') id: string,
    @OrganizationId() organizationId: string,
    @UserId() userId: string,
  ) {
    const payment = await this.paymentsService.voidPayment(id, organizationId, userId);
    return { success: true, data: payment, message: 'Payment voided successfully' };
  }

  @Get('lease/:leaseId/history')
  @ApiOperation({ summary: 'Get payment history for a lease' })
  @ApiParam({ name: 'leaseId', description: 'Lease ID' })
  @ApiResponse({ status: 200, description: 'Payment history' })
  @ApiResponse({ status: 404, description: 'Lease not found' })
  async getLeasePaymentHistory(
    @Param('leaseId') leaseId: string,
    @OrganizationId() organizationId: string,
  ) {
    const history = await this.paymentsService.getLeasePaymentHistory(leaseId, organizationId);
    return { success: true, data: history };
  }

  @Get('summary/methods')
  @ApiOperation({ summary: 'Get payment methods breakdown' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Payment methods summary' })
  async getPaymentMethodsSummary(
    @OrganizationId() organizationId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const summary = await this.paymentsService.getPaymentMethodsSummary(
      organizationId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return { success: true, data: summary };
  }
}
