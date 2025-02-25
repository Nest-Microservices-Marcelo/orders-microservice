import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('OrdersMS-main');

  //Configuracion para transporte de datos atraves de TCP
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      //Configuracion para transporte de datos atraves de NATS (instalar nats: $ npm i --save nats)
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers,
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen();
  logger.log(`Order Microservice running on port ${envs.port}`);
}
bootstrap();
