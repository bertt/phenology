Building docker database commands:

```

$ docker build -t bertt/phenology-db .

$ docker run -p 5432:5432 -e POSTGRES_DB=locophoto -e POSTGRES_USER=geodb -e POSTGRES_PASSWORD=geodb bertt/phenology

$ docker push bertt/phenology-db

```


