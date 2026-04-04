package vn.gada.api.auth

import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*
import vn.gada.api.common.exception.UnauthorizedException
import vn.gada.api.common.security.AuthUser

@RestController
@RequestMapping("/auth")
class AuthController(private val authService: AuthService) {

    /** GET /auth/me — Get current user profile */
    @GetMapping("/me")
    fun getMe(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        val profile = authService.getMe(user.id)
        return ok(profile)
    }

    /** POST /auth/register — Complete profile after OTP login */
    @PostMapping("/register")
    fun register(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        val name = body["name"] as? String
        val email = body["email"] as? String
        val result = authService.updateProfile(user.id, name, email)
        return ok(result)
    }

    /** POST /auth/register-fcm — Register FCM token */
    @PostMapping("/register-fcm")
    fun registerFcm(
        @AuthenticationPrincipal user: AuthUser?,
        @RequestBody body: Map<String, Any?>
    ): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        val token = body["token"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("token is required")
        val platform = body["platform"] as? String ?: "android"
        val result = authService.registerFcmToken(user.id, token, platform)
        return ok(result)
    }

    /** POST /auth/verify-token — Verify Firebase ID token (web session init) */
    @PostMapping("/verify-token")
    fun verifyToken(@RequestBody body: Map<String, Any?>): ResponseEntity<Map<String, Any?>> {
        val idToken = body["idToken"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("idToken is required")
        val result = authService.verifyAndGetOrCreateUser(idToken)
        return ok(result)
    }

    /** POST /auth/otp/send — Send OTP to phone */
    @PostMapping("/otp/send")
    fun sendOtp(@RequestBody body: Map<String, Any?>): ResponseEntity<Map<String, Any?>> {
        val phone = body["phone"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("phone is required")
        val result = authService.sendOtp(phone)
        return ok(result)
    }

    /** POST /auth/otp/verify — Verify OTP and get session token */
    @PostMapping("/otp/verify")
    fun verifyOtp(@RequestBody body: Map<String, Any?>): ResponseEntity<Map<String, Any?>> {
        val phone = body["phone"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("phone is required")
        val otp = body["otp"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("otp is required")
        val result = authService.verifyOtp(phone, otp)
        return ok(result)
    }

    /** POST /auth/login — Email + password login */
    @PostMapping("/login")
    fun loginEmail(@RequestBody body: Map<String, Any?>): ResponseEntity<Map<String, Any?>> {
        val email = body["email"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("email is required")
        val password = body["password"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("password is required")
        val result = authService.loginEmail(email, password)
        return ok(result)
    }

    /** POST /auth/social/facebook — Facebook social login */
    @PostMapping("/social/facebook")
    fun socialFacebook(@RequestBody body: Map<String, Any?>): ResponseEntity<Map<String, Any?>> {
        val idToken = body["idToken"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("idToken is required")
        val result = authService.socialFacebook(idToken)
        return ok(result)
    }

    /** POST /auth/social/google — Google social login (same flow as /verify-token) */
    @PostMapping("/social/google")
    fun socialGoogle(@RequestBody body: Map<String, Any?>): ResponseEntity<Map<String, Any?>> {
        val idToken = body["idToken"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("idToken is required")
        val result = authService.verifyAndGetOrCreateUser(idToken)
        return ok(result)
    }

    /** POST /auth/logout — Revoke Firebase tokens */
    @PostMapping("/logout")
    fun logout(@AuthenticationPrincipal user: AuthUser?): ResponseEntity<Map<String, Any?>> {
        if (user == null) throw UnauthorizedException("Unauthorized")
        authService.logout(user.firebaseUid)
        return ok(mapOf("success" to true))
    }

    private fun ok(data: Any?): ResponseEntity<Map<String, Any?>> =
        ResponseEntity.ok(mapOf("statusCode" to 200, "data" to data))
}
