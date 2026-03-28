package vn.gada.api.common.firebase

import com.google.auth.oauth2.GoogleCredentials
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthException
import com.google.firebase.auth.UserRecord
import com.google.firebase.messaging.FirebaseMessaging
import com.google.firebase.messaging.Message
import com.google.firebase.messaging.MulticastMessage
import com.google.firebase.messaging.Notification
import com.google.firebase.messaging.BatchResponse
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.io.FileInputStream

data class FirebaseSendResult(
    val successCount: Int,
    val responses: List<FirebaseMessageResponse>
)

data class FirebaseMessageResponse(
    val success: Boolean,
    val messageId: String?
)

@Service
class FirebaseService(
    @Value("\${gada.firebase.credentials-path}") private val credentialsPath: String,
    @Value("\${gada.firebase.project-id}") private val projectId: String
) {
    private val log = LoggerFactory.getLogger(FirebaseService::class.java)
    private var initialized = false

    @PostConstruct
    fun init() {
        if (FirebaseApp.getApps().isNotEmpty()) {
            initialized = true
            return
        }
        try {
            val stream = FileInputStream(credentialsPath)
            val options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(stream))
                .setProjectId(projectId)
                .build()
            FirebaseApp.initializeApp(options)
            initialized = true
            log.info("Firebase initialized successfully")
        } catch (e: Exception) {
            log.warn("Firebase init skipped (no credentials): {}", e.message)
        }
    }

    fun verifyIdToken(idToken: String): com.google.firebase.auth.FirebaseToken? {
        if (!initialized) return null
        return try {
            FirebaseAuth.getInstance().verifyIdToken(idToken)
        } catch (e: FirebaseAuthException) {
            log.debug("Firebase token verification failed: {}", e.message)
            null
        }
    }

    fun getOrCreateUserByPhone(e164Phone: String): Pair<String, Boolean> {
        return try {
            val user = FirebaseAuth.getInstance().getUserByPhoneNumber(e164Phone)
            Pair(user.uid, false)
        } catch (e: FirebaseAuthException) {
            val request = UserRecord.CreateRequest().setPhoneNumber(e164Phone)
            val created = FirebaseAuth.getInstance().createUser(request)
            Pair(created.uid, true)
        }
    }

    fun createCustomToken(uid: String): String {
        return FirebaseAuth.getInstance().createCustomToken(uid)
    }

    fun revokeRefreshTokens(uid: String) {
        if (!initialized) return
        try {
            FirebaseAuth.getInstance().revokeRefreshTokens(uid)
        } catch (e: Exception) {
            log.warn("Failed to revoke tokens for uid {}: {}", uid, e.message)
        }
    }

    fun sendMulticastNotification(
        tokens: List<String>,
        notification: Map<String, String>,
        data: Map<String, String>? = null
    ): FirebaseSendResult {
        if (!initialized || tokens.isEmpty()) {
            return FirebaseSendResult(0, emptyList())
        }
        return try {
            val msgBuilder = MulticastMessage.builder()
                .addAllTokens(tokens)
                .setNotification(
                    Notification.builder()
                        .setTitle(notification["title"])
                        .setBody(notification["body"])
                        .build()
                )
            if (data != null) msgBuilder.putAllData(data)

            val batchResponse: BatchResponse = FirebaseMessaging.getInstance().sendEachForMulticast(msgBuilder.build())
            val responses = batchResponse.responses.map {
                FirebaseMessageResponse(it.isSuccessful, if (it.isSuccessful) it.messageId else null)
            }
            FirebaseSendResult(batchResponse.successCount, responses)
        } catch (e: Exception) {
            log.warn("FCM multicast failed: {}", e.message)
            FirebaseSendResult(0, emptyList())
        }
    }

    fun normalizePhone(phone: String): String {
        val digits = phone.replace(Regex("[^\\d]"), "")
        return when {
            digits.startsWith("840") -> "+84${digits.drop(3)}"
            digits.startsWith("84") -> "+$digits"
            digits.startsWith("0") -> "+84${digits.drop(1)}"
            else -> "+$digits"
        }
    }
}
