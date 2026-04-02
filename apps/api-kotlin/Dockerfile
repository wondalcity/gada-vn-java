# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jdk AS builder
WORKDIR /app

# Copy gradle wrapper and build files first (for dependency caching)
COPY build.gradle.kts settings.gradle.kts gradlew ./
COPY gradle ./gradle

# Download dependencies (allows Docker layer caching)
RUN ./gradlew dependencies --no-daemon --quiet || true

# Copy source and build
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre
WORKDIR /app

# Security: run as non-root
RUN groupadd -r gada && useradd -r -g gada gada
USER gada

# Copy the fat JAR from builder
COPY --from=builder /app/build/libs/*.jar app.jar

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-7001}/v1/health || exit 1

EXPOSE ${PORT:-7001}

ENTRYPOINT ["java", \
  "-XX:+UseContainerSupport", \
  "-XX:MaxRAMPercentage=75.0", \
  "-Djava.security.egd=file:/dev/./urandom", \
  "-jar", "app.jar"]
