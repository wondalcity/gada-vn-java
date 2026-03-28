package vn.gada.api.common.security

data class AuthUser(
    val id: String,
    val firebaseUid: String,
    val role: String,
    val phone: String? = null,
    val email: String? = null
)
