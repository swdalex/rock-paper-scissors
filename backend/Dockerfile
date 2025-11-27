FROM gradle:jdk21-corretto AS build
WORKDIR /app

COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN gradle dependencies --no-daemon

COPY src ./src

RUN gradle build -x test --no-daemon

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

RUN apk add --no-cache curl

COPY --from=build /app/build/libs/*.jar app.jar

RUN addgroup -S spring && adduser -S spring -G spring
USER spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1
