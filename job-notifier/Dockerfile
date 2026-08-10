# Multi-stage build for Spring Boot application
FROM maven:3.9-eclipse-temurin-21 AS build

# Set working directory
WORKDIR /app

# Copy pom.xml and download dependencies (continue on failure)
COPY pom.xml .
RUN mvn dependency:go-offline -B || echo "Dependency pre-download failed, will download during build"

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine

# Set working directory
WORKDIR /app

# Create logs directory
RUN mkdir -p /app/logs && chmod 755 /app/logs

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Set environment variables (can be overridden)
ENV SPRING_PROFILES_ACTIVE=prod

# Volume for logs
VOLUME ["/app/logs"]

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

