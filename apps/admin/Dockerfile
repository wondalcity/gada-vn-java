# Admin: Spring Boot 3 + Kotlin + embedded React SPA
# Replaces incorrect PHP Dockerfile — admin is a Kotlin/Spring Boot app.

# ── Stage 1: Build React frontend ────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --quiet

COPY frontend/ ./
RUN npm run build
# Output: /app/frontend/dist/

# ── Stage 2: Build Spring Boot JAR ───────────────────────────────────────────
FROM eclipse-temurin:17-jdk-alpine AS backend-builder
WORKDIR /app

# Cache Gradle dependencies layer
COPY build.gradle.kts settings.gradle.kts gradlew ./
COPY gradle ./gradle
RUN ./gradlew dependencies --no-daemon --quiet || true

# Copy pre-built React dist into static resources before bootJar
# This bypasses the Gradle buildFrontend/copyFrontend tasks (they need npm in PATH)
COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static/

COPY src ./src

RUN ./gradlew bootJar --no-daemon -x test -x buildFrontend -x copyFrontend

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

RUN addgroup -S gada && adduser -S gada -G gada
USER gada

COPY --from=backend-builder /app/build/libs/*.jar app.jar

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-8081}/health || exit 1

EXPOSE ${PORT:-8081}

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
