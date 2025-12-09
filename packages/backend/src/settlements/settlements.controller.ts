import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SettlementsService } from './settlements.service';

@ApiTags('settlements')
@Controller('settlements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SettlementsController {
  constructor(private settlementsService: SettlementsService) {}

  @Get('balance')
  @Roles('ORGANIZATION_ADMIN', 'PROPERTY_MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get organization balance and recent activity' })
  @ApiResponse({ status: 200, description: 'Balance retrieved' })
  async getBalance(@Request() req: any) {
    return this.settlementsService.getBalance(req.user.organizationId);
  }

  @Get('ledger')
  @Roles('ORGANIZATION_ADMIN', 'PROPERTY_MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get settlement ledger history' })
  @ApiResponse({ status: 200, description: 'Ledger history retrieved' })
  async getLedgerHistory(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.settlementsService.getLedgerHistory(req.user.organizationId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      type,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get('payouts')
  @Roles('ORGANIZATION_ADMIN', 'PROPERTY_MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get payout history' })
  @ApiResponse({ status: 200, description: 'Payout history retrieved' })
  async getPayoutHistory(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.settlementsService.getPayoutHistory(req.user.organizationId, {
      status,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Post('payouts/request')
  @Roles('ORGANIZATION_ADMIN')
  @ApiOperation({ summary: 'Request a payout withdrawal' })
  @ApiResponse({ status: 201, description: 'Payout request created' })
  async requestPayout(
    @Request() req: any,
    @Body() body: { amount: number; bankAccountId: string },
  ) {
    return this.settlementsService.requestPayout(
      req.user.organizationId,
      body.amount,
      body.bankAccountId,
      req.user.id,
    );
  }

  @Patch('settings')
  @Roles('ORGANIZATION_ADMIN')
  @ApiOperation({ summary: 'Update payout settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updatePayoutSettings(
    @Request() req: any,
    @Body()
    body: {
      autoPayoutEnabled?: boolean;
      autoPayoutDay?: number;
      autoPayoutMinimum?: number;
      payoutBankAccountId?: string;
    },
  ) {
    return this.settlementsService.updatePayoutSettings(
      req.user.organizationId,
      body,
    );
  }

  // Admin-only: manually process or fail payouts
  @Post('payouts/:id/process')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Manually process a payout (admin only)' })
  async processPayout(@Param('id') id: string, @Request() req: any) {
    return this.settlementsService.processPayout(id, req.user.id);
  }

  @Post('payouts/:id/complete')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Mark payout as completed (admin only)' })
  async completePayout(
    @Param('id') id: string,
    @Body() body: { providerTransferId?: string },
  ) {
    return this.settlementsService.completePayout(id, body.providerTransferId);
  }

  @Post('payouts/:id/fail')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Mark payout as failed (admin only)' })
  async failPayout(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.settlementsService.failPayout(id, body.reason);
  }
}
