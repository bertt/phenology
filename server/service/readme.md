Commands for building Docker service:

```

$ docker build -t bertt/phenology-service .

$ docker run -p 3100:3100 bertt/phenology-service

$ docker push phenology-service