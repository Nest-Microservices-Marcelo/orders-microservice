import { Catch, ArgumentsHost, ExceptionFilter } from '@nestjs/common';

import { RpcException } from '@nestjs/microservices';

@Catch(RpcException)
export class RpcCustomExceptionFilter implements ExceptionFilter {
  catch(exception: RpcException, host: ArgumentsHost) {
    //Se obtiene el contexto de la excepcion

    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    //Se obtiene el error de la excepcion
    const rpcError = exception.getError();

    if (
      typeof rpcError === 'object' &&
      'status' in rpcError &&
      'message' in rpcError
    ) {
      const status = isNaN(+rpcError.status) ? 400 : +rpcError.status;
      return response.status(status).json(rpcError);
    }

    //Se envia un mensaje personalizado
    response.status(400).json({
      status: 400,
      message: rpcError,
    });
  }
}
