import {
  Controller,
  Get,
  Post,
  Delete,
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
  ApiBody,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { HelcimService } from './helcim.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';
import {
  RecordPaymentDto,
  RefundPaymentDto,
} from '../financial/dto/payment.dto';
import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

// DTOs for Helcim payments
class InitializeCheckoutDto {
  @IsString()
  tenantId!: string;

  @IsNumber()
  amount!: number;

  @IsArray()
  @IsString({ each: true })
  chargeIds!: string[];
}

class ProcessCardPaymentDto {
  @IsString()
  tenantId!: string;

  @IsString()
  cardToken!: string;

  @IsNumber()
  amount!: number;

  @IsArray()
  @IsString({ each: true })
  chargeIds!: string[];
}

class ProcessDirectPaymentDto {
  @IsString()
  tenantId!: string;

  @IsString()
  cardNumber!: string;

  @IsString()
  cardExpiry!: string;

  @IsString()
  cardCvv!: string;

  @IsString()
  cardHolderName!: string;

  @IsNumber()
  amount!: number;

  @IsArray()
  @IsString({ each: true })
  chargeIds!: string[];

  @IsOptional()
  billingAddress?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

@ApiTags('payments')
@Controller('payments')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private helcimService: HelcimService,
  ) {}

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

  @Get(':id/receipt')
  @ApiOperation({ summary: 'Get payment receipt data' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({ status: 200, description: 'Payment receipt data' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getReceipt(@Param('id') id: string, @OrganizationId() organizationId: string) {
    const receipt = await this.paymentsService.getPaymentReceipt(id, organizationId);
    return { success: true, data: receipt };
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

  // =====================================================
  // Helcim Card Payment Endpoints
  // =====================================================

  @Post('helcim/initialize-checkout')
  @ApiOperation({ summary: 'Initialize Helcim checkout session for card payment' })
  @ApiBody({ type: InitializeCheckoutDto })
  @ApiResponse({ status: 201, description: 'Checkout session initialized' })
  async initializeCheckout(
    @Body() dto: InitializeCheckoutDto,
    @OrganizationId() _organizationId: string,
  ) {
    const result = await this.helcimService.initializeCheckout(
      dto.amount,
      dto.tenantId,
      dto.chargeIds,
    );

    return {
      success: true,
      data: {
        checkoutToken: result.checkoutToken,
        secretToken: result.secretToken,
      },
    };
  }

  @Post('helcim/process-payment')
  @ApiOperation({ summary: 'Process card payment with Helcim token' })
  @ApiBody({ type: ProcessCardPaymentDto })
  @ApiResponse({ status: 201, description: 'Payment processed' })
  async processCardPayment(
    @Body() dto: ProcessCardPaymentDto,
    @OrganizationId() _organizationId: string,
  ) {
    const result = await this.helcimService.processPayment(
      dto.cardToken,
      dto.amount,
      dto.tenantId,
      dto.chargeIds,
    );

    return {
      success: true,
      data: {
        transactionId: result.transactionId,
        status: result.status,
        amount: result.amount,
        approvalCode: result.approvalCode,
      },
    };
  }

  @Post('helcim/process-direct')
  @ApiOperation({ summary: 'Process card payment directly (card details)' })
  @ApiBody({ type: ProcessDirectPaymentDto })
  @ApiResponse({ status: 201, description: 'Payment processed' })
  async processDirectPayment(
    @Body() dto: ProcessDirectPaymentDto,
    @OrganizationId() _organizationId: string,
  ) {
    const result = await this.helcimService.processDirectPayment(
      dto.cardNumber,
      dto.cardExpiry,
      dto.cardCvv,
      dto.cardHolderName,
      dto.amount,
      dto.tenantId,
      dto.chargeIds,
      dto.billingAddress,
    );

    return {
      success: true,
      data: {
        transactionId: result.transactionId,
        status: result.status,
        amount: result.amount,
        approvalCode: result.approvalCode,
      },
    };
  }

  @Post('helcim/refund/:transactionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund a Helcim transaction' })
  @ApiParam({ name: 'transactionId', description: 'Helcim Transaction ID' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  async refundHelcimPayment(
    @Param('transactionId') transactionId: string,
    @Body() body: { amount?: number },
  ) {
    const result = await this.helcimService.processRefund(
      parseInt(transactionId, 10),
      body.amount,
    );

    return {
      success: true,
      data: {
        transactionId: result.transactionId,
        status: result.status,
        amount: result.amount,
      },
    };
  }

  @Get('helcim/transaction/:transactionId')
  @ApiOperation({ summary: 'Get Helcim transaction details' })
  @ApiParam({ name: 'transactionId', description: 'Helcim Transaction ID' })
  @ApiResponse({ status: 200, description: 'Transaction details' })
  async getHelcimTransaction(@Param('transactionId') transactionId: string) {
    const result = await this.helcimService.getTransaction(parseInt(transactionId, 10));

    return {
      success: true,
      data: result,
    };
  }

  @Get('helcim/config')
  @ApiOperation({ summary: 'Get Helcim client configuration' })
  @ApiResponse({ status: 200, description: 'Helcim configuration for frontend' })
  async getHelcimConfig() {
    const config = this.helcimService.getClientConfig();

    return {
      success: true,
      data: {
        accountId: config.accountId,
        terminalId: config.terminalId,
        isConfigured: config.isConfigured,
      },
    };
  }

  @Get('helcim/status')
  @ApiOperation({ summary: 'Check Helcim integration status' })
  @ApiResponse({ status: 200, description: 'Helcim status' })
  async getHelcimStatus() {
    const configured = this.helcimService.checkConfigured();

    return {
      success: true,
      data: {
        configured,
        provider: 'helcim',
        features: {
          cardPayments: true,
          achPayments: false, // ACH via Dwolla (not ready yet)
          savedCards: true,
          refunds: true,
        },
      },
    };
  }
}
