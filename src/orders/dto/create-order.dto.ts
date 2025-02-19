import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { OrderItemDto } from './orden-item.dto';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1) //el array debe tener al menos un elemento
  @ValidateNested({ each: true }) //validacion interna de cada elemento
  @Type(() => OrderItemDto) // crear DTO de cómo va a lucir este items.
  items: OrderItemDto[];
}
// @IsNumber()
// @IsPositive()
// totalAmount: number;

// @IsNumber()
// @IsPositive()
// totalItems: number;

// @IsEnum(OrderStatusList, {
//   message: `Possible status values are ${OrderStatusList}`,
// })
// @IsOptional()
// status: OrderStatus = OrderStatus.PENDING;

// @IsBoolean()
// @IsOptional()
// paid: boolean = false;
