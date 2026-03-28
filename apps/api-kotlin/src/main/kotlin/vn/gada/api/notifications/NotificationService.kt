package vn.gada.api.notifications

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import vn.gada.api.common.exception.NotFoundException
import vn.gada.api.common.firebase.FirebaseService

@Service
class NotificationService(
    private val repo: NotificationRepository,
    private val firebase: FirebaseService
) {
    private val log = LoggerFactory.getLogger(NotificationService::class.java)

    fun findByUser(userId: String, page: Int, limit: Int, unreadOnly: Boolean): Map<String, Any?> {
        return repo.findByUserId(userId, page, limit, unreadOnly)
    }

    fun markRead(id: String, userId: String): Map<String, Any?>? {
        val notification = repo.findById(id, userId)
            ?: throw NotFoundException("Notification $id not found")
        return repo.markRead(id, userId)
    }

    fun markAllRead(userId: String): Map<String, Any> {
        val count = repo.markAllRead(userId)
        return mapOf("updated" to count)
    }

    /**
     * Store notification in DB and push via FCM if tokens are available.
     * Never throws — FCM failures are non-fatal.
     */
    fun send(
        userId: String,
        type: String,
        title: String,
        body: String,
        data: Map<String, Any?>? = null
    ): Map<String, Any?>? {
        var sentViaFcm = false
        var fcmMessageId: String? = null

        try {
            val tokens = repo.getFcmTokens(userId)
            if (tokens.isNotEmpty()) {
                val stringData = data?.entries?.associate { (k, v) -> k to v.toString() }

                val result = firebase.sendMulticastNotification(
                    tokens = tokens,
                    notification = mapOf("title" to title, "body" to body),
                    data = stringData
                )
                sentViaFcm = result.successCount > 0
                fcmMessageId = result.responses.firstOrNull { it.success }?.messageId
            }
        } catch (e: Exception) {
            log.warn("FCM push failed for user {}: {}", userId, e.message)
        }

        return try {
            repo.create(userId, type, title, body, data, sentViaFcm, fcmMessageId)
        } catch (e: Exception) {
            log.warn("Failed to persist notification for user {}: {}", userId, e.message)
            null
        }
    }
}
