import { IsString, IsUrl, IsUUID } from 'class-validator';

// DTO para la información de una orden pagada
export class PaidOrderDto {
  @IsString()
  stripePaymentId: string;

  @IsString()
  @IsUUID()
  orderId: string;

  @IsString()
  @IsUrl()
  receiptUrl: string;
}
