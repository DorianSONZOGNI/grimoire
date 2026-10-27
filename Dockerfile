# 1. Build de l'application Java avec Maven
FROM maven:3.9.6-eclipse-temurin-21 AS build
COPY . .
RUN mvn clean package -DskipTests

# 2. Lancement de l'application
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /target/*.jar app.jar

# Extension Lambda Web Adapter (totalement ignorée par Render et en local)
COPY --from=public.ecr.aws/awslabs/aws-lambda-web-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT=8080
# --
    
# Retour à la config de base
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]