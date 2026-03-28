package vn.gada.api.auth

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

data class OtpEntry(val otp: String, val expiresAt: Long)

@Component
class OtpStore(
    private val redis: StringRedisTemplate,
    @Value("\${gada.otp.fixed-code:}") private val fixedCode: String
) {
    private val log = LoggerFactory.getLogger(OtpStore::class.java)
    // In-memory fallback if Redis is unavailable
    private val memStore = ConcurrentHashMap<String, OtpEntry>()
    private val OTP_TTL_SECONDS = 300L

    fun generateOtp(): String {
        if (fixedCode.isNotBlank()) return fixedCode
        return (100000 + (Math.random() * 900000).toInt()).toString()
    }

    fun save(phone: String, otp: String) {
        try {
            redis.opsForValue().set("otp:$phone", otp, Duration.ofSeconds(OTP_TTL_SECONDS))
            log.debug("OTP saved to Redis for {}", phone)
        } catch (e: Exception) {
            log.warn("Redis unavailable, falling back to memory for OTP: {}", e.message)
            memStore[phone] = OtpEntry(otp, System.currentTimeMillis() + OTP_TTL_SECONDS * 1000)
        }
    }

    fun verify(phone: String, code: String): Boolean {
        // If fixed code is configured, always accept it (dev mode)
        if (fixedCode.isNotBlank() && code == fixedCode) {
            return true
        }

        // Try Redis first
        try {
            val stored = redis.opsForValue().get("otp:$phone")
            if (stored != null) {
                if (stored == code) {
                    redis.delete("otp:$phone")
                    return true
                }
                return false
            }
        } catch (e: Exception) {
            log.warn("Redis unavailable during OTP verify, checking memory: {}", e.message)
        }

        // Fallback to memory
        val entry = memStore[phone] ?: return false
        if (entry.expiresAt < System.currentTimeMillis()) {
            memStore.remove(phone)
            return false
        }
        if (entry.otp == code) {
            memStore.remove(phone)
            return true
        }
        return false
    }

    fun isExpiredOrMissing(phone: String): Boolean {
        try {
            val stored = redis.opsForValue().get("otp:$phone")
            if (stored != null) return false
        } catch (e: Exception) {
            log.warn("Redis check failed: {}", e.message)
        }
        val entry = memStore[phone] ?: return true
        return entry.expiresAt < System.currentTimeMillis()
    }
}
