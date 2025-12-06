import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
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
import { StripeService } from './stripe.service';
import { OrganizationId } from '../common/decorators/organization.decorator';
import { UserId } from '../common/decorators/user-id.decorator';
import {
  RecordPaymentDto,
  CreatePaymentIntentDto,
  RefundPaymentDto,
} from '../financial/dto/payment.dto';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

class CreateSetupIntentDto {
  @IsString()
  tenantId!: string;
}

class AttachPaymentMethodDto {
  @IsString()
  paymentMethodId!: string;

  @IsOptional()
  @IsBoolean()
  setAsDefault?: boolean;
}

class SetDefaultPaymentMethodDto {
  @IsString()
  paymentMethodId!: string;
}

class ChargeWithSavedMethodDto {
  @IsString()
  paymentMethodId!: string;

  @IsNumber()
  amount!: number;

  @IsString({ each: true })
  chargeIds!: string[];
}

@ApiTags('payments')
@Controller('payments')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private stripeService: StripeService,
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

  // =====================================================
  // Stripe Payment Method Management Endpoints
  // =====================================================

  @Post('stripe/setup-intent')
  @ApiOperation({ summary: 'Create a Setup Intent for saving payment methods' })
  @ApiBody({ type: CreateSetupIntentDto })
  @ApiResponse({ status: 201, description: 'Setup intent created' })
  async createSetupIntent(
    @Body() dto: CreateSetupIntentDto,
    @OrganizationId() organizationId: string,
  ) {
    const customer = await this.paymentsService.getOrCreateStripeCustomer(
      dto.tenantId,
      organizationId,
    );
    const setupIntent = await this.stripeService.createSetupIntent(customer.id);
    return {
      success: true,
      data: {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id,
      },
    };
  }

  @Get('stripe/customer/:tenantId/payment-methods')
  @ApiOperation({ summary: 'List all payment methods for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiResponse({ status: 200, description: 'List of payment methods' })
  async listPaymentMethods(
    @Param('tenantId') tenantId: string,
    @OrganizationId() organizationId: string,
  ) {
    const customer = await this.paymentsService.getOrCreateStripeCustomer(tenantId, organizationId);
    const methods = await this.stripeService.listAllPaymentMethods(customer.id);
    const defaultMethod = await this.stripeService.getDefaultPaymentMethod(customer.id);

    return {
      success: true,
      data: {
        cards: methods.cards.map((card) => ({
          id: card.id,
          brand: card.card?.brand,
          last4: card.card?.last4,
          expMonth: card.card?.exp_month,
          expYear: card.card?.exp_year,
          isDefault: defaultMethod?.id === card.id,
        })),
        bankAccounts: methods.bankAccounts.map((bank) => ({
          id: bank.id,
          bankName: bank.us_bank_account?.bank_name,
          last4: bank.us_bank_account?.last4,
          accountType: bank.us_bank_account?.account_type,
          isDefault: defaultMethod?.id === bank.id,
        })),
      },
    };
  }

  @Post('stripe/customer/:tenantId/payment-methods')
  @ApiOperation({ summary: 'Attach a payment method to a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiBody({ type: AttachPaymentMethodDto })
  @ApiResponse({ status: 201, description: 'Payment method attached' })
  async attachPaymentMethod(
    @Param('tenantId') tenantId: string,
    @Body() dto: AttachPaymentMethodDto,
    @OrganizationId() organizationId: string,
  ) {
    const customer = await this.paymentsService.getOrCreateStripeCustomer(tenantId, organizationId);
    const paymentMethod = await this.stripeService.attachPaymentMethod(
      customer.id,
      dto.paymentMethodId,
    );

    if (dto.setAsDefault) {
      await this.stripeService.setDefaultPaymentMethod(customer.id, dto.paymentMethodId);
    }

    return {
      success: true,
      data: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        card: paymentMethod.card
          ? {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              expMonth: paymentMethod.card.exp_month,
              expYear: paymentMethod.card.exp_year,
            }
          : undefined,
        bankAccount: paymentMethod.us_bank_account
          ? {
              bankName: paymentMethod.us_bank_account.bank_name,
              last4: paymentMethod.us_bank_account.last4,
              accountType: paymentMethod.us_bank_account.account_type,
            }
          : undefined,
      },
    };
  }

  @Delete('stripe/payment-methods/:paymentMethodId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a payment method' })
  @ApiParam({ name: 'paymentMethodId', description: 'Stripe Payment Method ID' })
  @ApiResponse({ status: 200, description: 'Payment method removed' })
  async detachPaymentMethod(@Param('paymentMethodId') paymentMethodId: string) {
    await this.stripeService.detachPaymentMethod(paymentMethodId);
    return {
      success: true,
      message: 'Payment method removed successfully',
    };
  }

  @Patch('stripe/customer/:tenantId/default-payment-method')
  @ApiOperation({ summary: 'Set default payment method for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiBody({ type: SetDefaultPaymentMethodDto })
  @ApiResponse({ status: 200, description: 'Default payment method updated' })
  async setDefaultPaymentMethod(
    @Param('tenantId') tenantId: string,
    @Body() dto: SetDefaultPaymentMethodDto,
    @OrganizationId() organizationId: string,
  ) {
    const customer = await this.paymentsService.getOrCreateStripeCustomer(tenantId, organizationId);
    await this.stripeService.setDefaultPaymentMethod(customer.id, dto.paymentMethodId);

    return {
      success: true,
      message: 'Default payment method updated',
    };
  }

  @Post('stripe/customer/:tenantId/charge-saved')
  @ApiOperation({ summary: 'Charge tenant using a saved payment method' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiBody({ type: ChargeWithSavedMethodDto })
  @ApiResponse({ status: 201, description: 'Payment processed' })
  async chargeWithSavedMethod(
    @Param('tenantId') tenantId: string,
    @Body() dto: ChargeWithSavedMethodDto,
    @OrganizationId() organizationId: string,
  ) {
    const customer = await this.paymentsService.getOrCreateStripeCustomer(tenantId, organizationId);

    const paymentIntent = await this.stripeService.chargeWithSavedMethod(
      customer.id,
      dto.paymentMethodId,
      dto.amount,
      {
        tenantId,
        chargeIds: dto.chargeIds.join(','),
        organizationId,
      },
    );

    return {
      success: true,
      data: {
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount / 100,
      },
    };
  }

  @Get('stripe/customer/:tenantId/invoices')
  @ApiOperation({ summary: 'List invoices for a tenant' })
  @ApiParam({ name: 'tenantId', description: 'Tenant ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of invoices to return' })
  @ApiResponse({ status: 200, description: 'List of invoices' })
  async listInvoices(
    @Param('tenantId') tenantId: string,
    @Query('limit') limit: string = '10',
    @OrganizationId() organizationId: string,
  ) {
    const customer = await this.paymentsService.getOrCreateStripeCustomer(tenantId, organizationId);
    const invoices = await this.stripeService.listInvoices(customer.id, parseInt(limit, 10));

    return {
      success: true,
      data: invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        status: invoice.status,
        amount: invoice.amount_due / 100,
        amountPaid: invoice.amount_paid / 100,
        dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
        invoicePdf: invoice.invoice_pdf,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      })),
    };
  }

  @Get('stripe/status')
  @ApiOperation({ summary: 'Check Stripe integration status' })
  @ApiResponse({ status: 200, description: 'Stripe status' })
  async getStripeStatus() {
    const configured = this.stripeService.isConfigured();
    let accountInfo = null;

    if (configured) {
      const account = await this.stripeService.getAccountInfo();
      if (account) {
        accountInfo = {
          id: account.id,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          country: account.country,
        };
      }
    }

    return {
      success: true,
      data: {
        configured,
        account: accountInfo,
      },
    };
  }
}
