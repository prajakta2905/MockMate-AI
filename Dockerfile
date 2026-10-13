# ===============================================================
# MockMate AI — Full-Stack Single Container Production Dockerfile
# Multi-Stage Build: React 19 Frontend + Java 17 Spring Boot Backend
# ===============================================================

# --- Stage 1: Build React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Spring Boot JAR with Built Frontend Assets ---
FROM eclipse-temurin:17-jdk-jammy AS backend-builder
WORKDIR /app

RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

COPY pom.xml .
COPY src ./src

# Copy built frontend assets into Spring Boot's static resources
COPY --from=frontend-builder /app/frontend/dist/ ./src/main/resources/static/

RUN mvn clean package -DskipTests

# --- Stage 3: Lightweight Production JRE Runtime ---
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# Non-root user for security best practices
RUN useradd -m -u 1001 mockmateuser && chown -R mockmateuser:mockmateuser /app
USER mockmateuser

COPY --from=backend-builder --chown=mockmateuser:mockmateuser /app/target/mockmate-java-1.0.0.jar app.jar

ENV PORT=8080
ENV JAVA_OPTS="-Xmx384m -Xms128m -XX:+UseG1GC"
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java ${JAVA_OPTS} -Dserver.port=${PORT} -Djava.security.egd=file:/dev/./urandom -jar app.jar"]
