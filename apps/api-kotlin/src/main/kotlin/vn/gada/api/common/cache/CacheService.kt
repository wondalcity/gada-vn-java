package vn.gada.api.common.cache

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration

@Service
class CacheService(
    private val redis: StringRedisTemplate,
    private val objectMapper: ObjectMapper
) {
    private val log = LoggerFactory.getLogger(CacheService::class.java)

    fun get(key: String): Any? {
        return try {
            val value = redis.opsForValue().get(key) ?: return null
            objectMapper.readValue(value, Any::class.java)
        } catch (e: Exception) {
            log.debug("Cache miss or error for key {}: {}", key, e.message)
            null
        }
    }

    fun set(key: String, value: Any, ttlSeconds: Long = 300) {
        try {
            val json = objectMapper.writeValueAsString(value)
            redis.opsForValue().set(key, json, Duration.ofSeconds(ttlSeconds))
        } catch (e: Exception) {
            log.debug("Cache set failed for key {}: {}", key, e.message)
        }
    }

    fun del(key: String) {
        try {
            redis.delete(key)
        } catch (e: Exception) {
            log.debug("Cache delete failed for key {}: {}", key, e.message)
        }
    }

    fun delPattern(pattern: String) {
        try {
            val keys = redis.keys(pattern)
            if (keys != null && keys.isNotEmpty()) {
                redis.delete(keys)
            }
        } catch (e: Exception) {
            log.debug("Cache delPattern failed for pattern {}: {}", pattern, e.message)
        }
    }

    fun saveOtp(phone: String, code: String) {
        try {
            redis.opsForValue().set("otp:$phone", code, Duration.ofMinutes(5))
        } catch (e: Exception) {
            log.warn("Failed to save OTP to Redis for {}: {}", phone, e.message)
        }
    }

    fun verifyOtp(phone: String, code: String): Boolean {
        return try {
            val stored = redis.opsForValue().get("otp:$phone") ?: return false
            if (stored == code) {
                redis.delete("otp:$phone")
                true
            } else {
                false
            }
        } catch (e: Exception) {
            log.warn("Failed to verify OTP from Redis for {}: {}", phone, e.message)
            false
        }
    }
}
