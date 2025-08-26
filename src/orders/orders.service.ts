import {
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto, PaidOrderDto } from './dto';
import { NATS_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './interfaces/order-with-products.interface';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('OrdersService');

  constructor(
    //TRAEMOS LA BASE DE DATOS DE PRODUCTS-MS
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  //CREATE
  async create(createOrderDto: CreateOrderDto) {
    try {
      //1 - Confirmar los ids de los productos
      const productsIds = createOrderDto.items.map((item) => item.productId);

      const products: any[] = await firstValueFrom(
        await this.client.send({ cmd: 'validate_products' }, productsIds),
      ); //Usamos el "productsClient" para llamar a la funcion validate_products y pasarles los ids de los productos que quiero traer de products-ms

      //2 - Calculos de los valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(
          (product) => product.id === orderItem.productId,
        ).price;

        return acc + price * orderItem.quantity;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      //3 - Crear una transaccion de la base de datos
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                //buscamos el precio en la base de datos y no por el orderItem para tener un precio mas preciso
                price: products.find(
                  (product) => product.id === orderItem.productId,
                ).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity,
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true,
            },
          },
        },
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            .name,
        })),
      };
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'Error validating products',
      });
    }
  }

  // return {
  //   service: 'Orders Microservice',
  //   createOrderDto: createOrderDto,
  // };
  // return this.order.create({
  //   data: createOrderDto,
  // });

  //FIND ALL
  async findAll(orderPaginationDto: OrderPaginationDto) {
    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status,
      },
    });
    const currentPage = orderPaginationDto.page;
    const perPage = orderPaginationDto.limit;

    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
          status: orderPaginationDto.status,
        },
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage),
      },
    };
  }

  //FIND ONE
  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true,
          },
        },
      },
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with ID #${id} not found`,
      });
    }

    //Buscamos el ID los productos que tiene la orden
    const productsIds = order.OrderItem.map((orderItem) => orderItem.productId);

    //Validamos los productos y los buscamos en la base de datos
    const products: any[] = await firstValueFrom(
      await this.client.send({ cmd: 'validate_products' }, productsIds),
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: products.find((product) => product.id === orderItem.productId)
          .name,
      })),
    };
  }

  //CHANGE STATUS
  async changeStatus(changeOrderStatus: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatus;

    const order = await this.findOne(id);
    //esta condicion hace que la DB no se actualice a cada rato cada vez que el status que le llega sea identico del que ya tiene
    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: {
        status: status,
      },
    });
  }

  //CREATE PAYMENT SESSION
  async createPaymentSession(order: OrderWithProducts) {
    // Enviamos un mensaje al microservicio de pagos para crear una sesión de pago
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        orderId: order.id,
        currency: 'usd',
        items: order.OrderItem.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      }),
    );

    return paymentSession;
  }

  //PAY ORDER
  // Actualizar la orden como pagada cuando recibamos la confirmación del pago
  async paidOrder(paidOrderDto: PaidOrderDto) {
    this.logger.log('Order paid');
    this.logger.log(paidOrderDto);

    const order = await this.order.update({
      where: { id: paidOrderDto.orderId },
      data: {
        status: 'PAID',
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId, // Guardar el ID del pago de Stripe

        // La relacion
        OrderRecipt: {
          create: {
            reciptUrl: paidOrderDto.receiptUrl,
          },
        },
      },
    });

    return order;
  }
}
