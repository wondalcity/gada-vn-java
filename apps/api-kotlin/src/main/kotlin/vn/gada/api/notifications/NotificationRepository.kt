package vn.gada.api.notifications

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService

@Repository
class NotificationRepository(
    private val db: DatabaseService,
    private val objectMapper: ObjectMapper
) {

    fun findByUserId(userId: String, page: Int, limit: Int, unreadOnly: Boolean): Map<String, Any?> {
        val offset = (page - 1) * limit
        val unreadFilter = if (unreadOnly) "AND read = FALSE" else ""

        val rows = db.queryForList(
            """SELECT * FROM ops.notifications
               WHERE user_id = ? $unreadFilter
               ORDER BY created_at DESC
               LIMIT ? OFFSET ?""",
            userId, limit, offset
        )

        val countRows = db.queryForList(
            "SELECT COUNT(*) as count FROM ops.notifications WHERE user_id = ? AND read = FALSE",
            userId
        )
        val unreadCount = (countRows.firstOrNull()?.get("count") as? Number)?.toInt() ?: 0

        return mapOf("data" to rows, "unreadCount" to unreadCount)
    }

    fun findById(id: String, userId: String): Map<String, Any?>? {
        return db.queryForList(
            "SELECT * FROM ops.notifications WHERE id = ? AND user_id = ?",
            id, userId
        ).firstOrNull()
    }

    fun markRead(id: String, userId: String): Map<String, Any?>? {
        return db.queryForList(
            """UPDATE ops.notifications SET read = TRUE
               WHERE id = ? AND user_id = ?
               RETURNING *""",
            id, userId
        ).firstOrNull()
    }

    fun markAllRead(userId: String): Int {
        return db.updateRaw(
            "UPDATE ops.notifications SET read = TRUE WHERE user_id = ? AND read = FALSE",
            userId
        )
    }

    fun create(
        userId: String,
        type: String,
        title: String,
        body: String,
        data: Map<String, Any?>?,
        sentViaFcm: Boolean = false,
        fcmMessageId: String? = null
    ): Map<String, Any?>? {
        val dataJson = if (data != null) objectMapper.writeValueAsString(data) else "{}"
        return db.queryForListRaw(
            """INSERT INTO ops.notifications (user_id, type, title, body, data, sent_via_fcm, fcm_message_id)
               VALUES (?, ?, ?, ?, ?::jsonb, ?, ?)
               RETURNING *""",
            userId, type, title, body, dataJson, sentViaFcm, fcmMessageId
        ).firstOrNull()
    }

    fun getFcmTokens(userId: String): List<String> {
        return db.queryForList(
            "SELECT token FROM ops.fcm_tokens WHERE user_id = ?",
            userId
        ).mapNotNull { it["token"] as? String }
    }
}
