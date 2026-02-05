# Orders MicroService

```
docker compose up -d
```

## Development pasos'

1. Clonar el proyecto
   2.Crear un archivo `.env` basado en el archivo `.env.template`
2. Levantar la base de datos con `docker-compose up -d`
3. Levantar el servidor de NATS

```
docker run -d --name nats-main -p 4222:4222 -p 6222:6222 -p 8222:8222 nats
```

4. Levantar el proyecto con `npm run start:dev`
