# ===============================================================
# MockMate AI — Single Container Full-Stack Deployment Dockerfile
# Serves React Frontend + Java Spring Boot REST API in 1 Single Place!
# ===============================================================

# --- Stage 1: Build Java Spring Boot Application ---
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /app

# Install Maven
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

COPY pom.xml .
COPY src ./src

# Package everything into a standalone executable JAR
RUN mvn clean package -DskipTests

# --- Stage 2: Ultra-lightweight Production Runtime ---
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Non-root user for enterprise cloud security
RUN useradd -m mockmateuser
USER mockmateuser

COPY --from=builder /app/target/mockmate-java-1.0.0.jar app.jar

ENV PORT=8080
EXPOSE 8080

ENTRYPOINT ["java", "-Dserver.port=${PORT}", "-jar", "app.jar"]
