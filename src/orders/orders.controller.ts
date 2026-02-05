import { Controller, ParseUUIDPipe } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import {
  ChangeOrderStatusDto,
  CreateOrderDto,
  OrderPaginationDto,
  PaidOrderDto,
} from './dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  //CREATE ORDER
  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    const paymentSession = await this.ordersService.createPaymentSession(order);

    return {
      order,
      paymentSession,
    };
  }

  //FIND ALL ORDERS
  @MessagePattern('findAllOrders')
  findAll(@Payload() orderPaginationDto: OrderPaginationDto) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  //FIND ONE ORDER
  @MessagePattern('findOneOrder')
  findOne(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  //CHANGE ORDER STATUS
  @MessagePattern('changeOrderStatus')
  changeOrderStatus(@Payload() changeOrderStatusDto: ChangeOrderStatusDto) {
    return this.ordersService.changeStatus(changeOrderStatusDto);
  }

  //VALIDATE ORDER
  @MessagePattern('validateOrder')
  validateOrder(@Payload('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOne(id);
  }

  //PAY ORDER
  // Se puede convinar tanto @EventPattern como @MessagePattern para manejar eventos de microservicios
  @EventPattern('payment.succeeded') // Escucha el evento que emite el microservicio de payments.service.ts y lo captura
  paidOrder(@Payload() paidOrderDto: PaidOrderDto) {
    return this.ordersService.paidOrder(paidOrderDto);
  }
}
