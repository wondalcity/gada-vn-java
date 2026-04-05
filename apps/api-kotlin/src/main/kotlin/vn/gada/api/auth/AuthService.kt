package vn.gada.api.auth

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import vn.gada.api.common.exception.BadRequestException
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.firebase.FirebaseService

@Service
class AuthService(
    private val repo: AuthRepository,
    private val firebase: FirebaseService,
    private val otpStore: OtpStore,
    @Value("\${spring.profiles.active:default}") private val activeProfile: String,
    @Value("\${gada.firebase.web-api-key:}") private val firebaseWebApiKey: String
) {
    private val log = LoggerFactory.getLogger(AuthService::class.java)
    private val isDev: Boolean get() = activeProfile != "production" && activeProfile != "prod"

    fun verifyAndGetOrCreateUser(idToken: String, name: String? = null, emailOverride: String? = null): Map<String, Any?> {
        val decoded = firebase.verifyIdToken(idToken)
            ?: throw UnauthorizedException("Invalid token")
        val existing = repo.findByFirebaseUid(decoded.uid)
        if (existing != null) {
            // If account was soft-deleted, treat as new registration
            if (existing["status"] == "DELETED") {
                repo.reactivateUser(existing["id"] as String, name ?: (decoded.claims["phone_number"] as? String))
                val reactivated = repo.findByFirebaseUid(decoded.uid)!!
                return mapOf("user" to reactivated, "isNew" to true)
            }
            // Ensure worker_profile exists (handles incomplete registrations)
            val userId = existing["id"] as String
            repo.ensureWorkerProfile(userId, name ?: (existing["phone"] as? String))
            return mapOf("user" to existing, "isNew" to false)
        }
        val phoneNumber = decoded.claims["phone_number"] as? String
        val tokenEmail = decoded.claims["email"] as? String
        val email = emailOverride ?: tokenEmail
        val user = repo.create(decoded.uid, phoneNumber, email, "WORKER")
        repo.ensureWorkerProfile(user["id"] as String, name ?: phoneNumber)
        return mapOf("user" to user, "isNew" to true)
    }

    fun getMe(userId: String): Map<String, Any?>? {
        return repo.getMeProfile(userId)
    }

    fun updateProfile(userId: String, name: String?, email: String?): Map<String, Any?>? {
        return repo.updateProfile(userId, name, email)
    }

    fun registerFcmToken(userId: String, token: String, platform: String): Map<String, Any> {
        repo.upsertFcmToken(userId, token, platform)
        return mapOf("success" to true)
    }

    // ── OTP flow ─────────────────────────────────────────────────────────────

    fun sendOtp(phone: String): Map<String, Any?> {
        val normalized = normalizePhone(phone)
        val otp = otpStore.generateOtp()
        otpStore.save(normalized, otp)

        log.info("[OTP] {}: {}", normalized, otp)

        return if (isDev) {
            mapOf("message" to "인증번호가 발송되었습니다.", "devOtp" to otp)
        } else {
            mapOf("message" to "인증번호가 발송되었습니다.")
        }
    }

    fun verifyOtp(phone: String, otp: String): Map<String, Any?> {
        val normalized = normalizePhone(phone)

        if (otpStore.isExpiredOrMissing(normalized)) {
            throw UnauthorizedException("인증번호가 만료되었습니다.")
        }

        val valid = otpStore.verify(normalized, otp)
        if (!valid) {
            throw UnauthorizedException("인증번호가 올바르지 않습니다.")
        }

        // Find or create Firebase user by phone
        val (uid, isFirebaseNew) = firebase.getOrCreateUserByPhone(normalized)

        // Find or create DB user
        var dbUser = repo.findByFirebaseUid(uid)
        var isNewUser = isFirebaseNew
        if (dbUser == null) {
            dbUser = repo.findByPhone(normalized)
            if (dbUser != null) {
                // Phone exists but different firebase uid — update it
                repo.updateFirebaseUid(dbUser["id"] as String, uid)
                dbUser = dbUser.toMutableMap().apply { put("firebase_uid", uid) }
            } else {
                dbUser = repo.create(uid, normalized, null, "WORKER")
                repo.ensureWorkerProfile(dbUser["id"] as String, normalized)
                isNewUser = true
            }
        }

        return if (isDev) {
            mapOf("devToken" to "dev_${dbUser["id"]}", "isNewUser" to isNewUser)
        } else {
            val customToken = firebase.createCustomToken(uid)
            mapOf("customToken" to customToken, "isNewUser" to isNewUser)
        }
    }

    // ── Email + password login ────────────────────────────────────────────────

    fun loginEmail(email: String, password: String): Map<String, Any?> {
        if (firebaseWebApiKey.isBlank()) {
            throw BadRequestException("Email login not configured")
        }

        val url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$firebaseWebApiKey"
        val body = """{"email":"$email","password":"$password","returnSecureToken":true}"""

        val connection = java.net.URL(url).openConnection() as java.net.HttpURLConnection
        connection.requestMethod = "POST"
        connection.setRequestProperty("Content-Type", "application/json")
        connection.doOutput = true
        connection.outputStream.write(body.toByteArray())

        if (connection.responseCode != 200) {
            throw UnauthorizedException("이메일 또는 비밀번호가 올바르지 않습니다.")
        }

        val responseBody = connection.inputStream.bufferedReader().readText()
        val uid = extractJsonField(responseBody, "localId")
            ?: throw UnauthorizedException("이메일 또는 비밀번호가 올바르지 않습니다.")

        var dbUser = repo.findByFirebaseUid(uid)
        if (dbUser == null) {
            dbUser = repo.create(uid, null, email, "WORKER")
            repo.ensureWorkerProfile(dbUser["id"] as String, null)
        }

        return if (isDev) {
            mapOf("devToken" to "dev_${dbUser["id"]}")
        } else {
            val customToken = firebase.createCustomToken(uid)
            mapOf("customToken" to customToken)
        }
    }

    // ── Facebook social login ─────────────────────────────────────────────────

    fun socialFacebook(idToken: String, name: String? = null, emailOverride: String? = null): Map<String, Any?> {
        val decoded = firebase.verifyIdToken(idToken)
            ?: throw UnauthorizedException("Invalid token")
        var dbUser = repo.findByFirebaseUid(decoded.uid)
        var isNewUser = false
        if (dbUser == null) {
            val phoneNumber = decoded.claims["phone_number"] as? String
            val tokenEmail = decoded.claims["email"] as? String
            val email = emailOverride ?: tokenEmail
            dbUser = repo.create(decoded.uid, phoneNumber, email, "WORKER")
            repo.ensureWorkerProfile(dbUser["id"] as String, name ?: phoneNumber)
            isNewUser = true
        } else {
            // Ensure worker_profile has a name (handles incomplete SSO registrations)
            if (name != null) {
                repo.ensureWorkerProfile(dbUser["id"] as String, name)
            }
        }
        return mapOf("isNewUser" to isNewUser)
    }

    // ── Test account login (staging only) ────────────────────────────────────

    fun testLogin(role: String): Map<String, Any?> {
        if (!isDev) throw BadRequestException("Not available in production")
        val normalizedRole = role.uppercase()
        if (normalizedRole != "WORKER" && normalizedRole != "MANAGER") {
            throw BadRequestException("role must be WORKER or MANAGER")
        }
        val user = repo.upsertTestAccount(normalizedRole)
        return mapOf("devToken" to "dev_${user["id"]}", "role" to normalizedRole)
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    fun logout(firebaseUid: String) {
        try {
            firebase.revokeRefreshTokens(firebaseUid)
        } catch (e: Exception) {
            // Ignore — local session will be cleared by client
            log.debug("Token revocation failed for {}: {}", firebaseUid, e.message)
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    fun normalizePhone(phone: String): String {
        val digits = phone.replace(Regex("[^\\d]"), "")
        return when {
            digits.startsWith("840") -> "+84${digits.drop(3)}"
            digits.startsWith("84") -> "+$digits"
            digits.startsWith("0") -> "+84${digits.drop(1)}"
            else -> "+$digits"
        }
    }

    private fun extractJsonField(json: String, field: String): String? {
        val pattern = Regex(""""$field"\s*:\s*"([^"]+)"""")
        return pattern.find(json)?.groupValues?.get(1)
    }
}
