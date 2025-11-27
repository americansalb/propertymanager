import { Module } from '@nestjs/common';
import { FinancialService } from './financial.service';
import { FinancialController } from './financial.controller';
import { ChargesService } from './charges.service';

@Module({
  providers: [FinancialService, ChargesService],
  controllers: [FinancialController],
  exports: [FinancialService, ChargesService],
})
export class FinancialModule {}
