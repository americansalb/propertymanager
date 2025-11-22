import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  // @ts-expect-error - Stripe instance for future use
  private stripe!: Stripe;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  async findAll(organizationId: string) {
    return this.prisma.payment.findMany({
      where: {
        tenant: {
          lease: {
            unit: {
              property: {
                organizationId,
              },
            },
          },
        },
      },
      include: {
        tenant: true,
      },
      orderBy: { paymentDate: 'desc' },
      take: 100,
    });
  }
}
