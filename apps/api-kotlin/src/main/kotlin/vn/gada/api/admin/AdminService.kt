package vn.gada.api.admin

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import vn.gada.api.common.exception.NotFoundException
import vn.gada.api.notifications.NotificationService

@Service
class AdminService(
    private val repo: AdminRepository,
    private val notifications: NotificationService,
    @Value("\${spring.profiles.active:default}") private val activeProfile: String
) {
    private val log = LoggerFactory.getLogger(AdminService::class.java)
    private val isDev: Boolean get() = activeProfile != "production" && activeProfile != "prod"

    fun listManagers(status: String, page: Int, limit: Int): Map<String, Any?> {
        val data = repo.findManagersPaginated(status, page, limit)
        val total = repo.countManagers(status)
        return mapOf("data" to data, "total" to total, "page" to page, "limit" to limit)
    }

    fun getManager(id: String): Map<String, Any?> {
        return repo.findManagerById(id) ?: throw NotFoundException("Manager $id not found")
    }

    fun approveManager(id: String): Map<String, Any?>? {
        repo.findManagerById(id) ?: throw NotFoundException("Manager $id not found")
        return repo.approveManager(id)
    }

    fun rejectManager(id: String, reason: String): Map<String, Any?>? {
        repo.findManagerById(id) ?: throw NotFoundException("Manager $id not found")
        return repo.rejectManager(id, reason)
    }

    fun searchUsers(search: String, role: String, limit: Int = 30): List<Map<String, Any?>> {
        return repo.searchUsers(search, role, limit)
    }

    fun getUsersByRole(role: String): List<Map<String, Any?>> {
        return repo.getUsersByRole(role)
    }

    fun sendBulkNotification(
        userIds: List<String>,
        title: String,
        body: String,
        channels: List<String>,
        type: String = "ADMIN"
    ): Map<String, Any?> {
        val results = mutableMapOf<String, Any>(
            "push" to 0,
            "sms" to 0,
            "errors" to mutableListOf<String>()
        )

        @Suppress("UNCHECKED_CAST")
        val errors = results["errors"] as MutableList<String>

        if (channels.contains("push")) {
            var pushCount = 0
            for (userId in userIds) {
                try {
                    notifications.send(userId, type, title, body)
                    pushCount++
                } catch (e: Exception) {
                    log.warn("Push failed for {}: {}", userId, e.message)
                    errors.add("push:$userId")
                }
            }
            results["push"] = pushCount
        }

        if (channels.contains("sms")) {
            val phoneRows = repo.getUserPhones(userIds)
            var smsCount = 0
            for (row in phoneRows) {
                val phone = row["phone"] as? String ?: continue
                try {
                    sendSms(phone, "[GADA] $title\n$body")
                    smsCount++
                } catch (e: Exception) {
                    log.warn("SMS failed for {}: {}", phone, e.message)
                }
            }
            results["sms"] = smsCount
        }

        return results
    }

    private fun sendSms(phone: String, message: String) {
        if (isDev) {
            log.info("[SMS DEV] To: {} | {}", phone, message)
            return
        }
        log.warn("SMS provider not configured. Would send to {}", phone)
    }

    fun getPushSchedules(): List<Map<String, Any?>> {
        return repo.findPushSchedules()
    }

    fun createPushSchedule(data: Map<String, Any?>): Map<String, Any?>? {
        val title = data["title"] as? String ?: ""
        val body = data["body"] as? String ?: ""
        @Suppress("UNCHECKED_CAST")
        val targetUserIds = data["targetUserIds"] as? List<String>
        val targetRole = data["targetRole"] as? String
        val scheduledAt = data["scheduledAt"] as? String ?: throw vn.gada.api.common.exception.BadRequestException("scheduledAt is required")
        return repo.createPushSchedule(title, body, targetUserIds, targetRole, scheduledAt)
    }

    fun cancelPushSchedule(id: String): Map<String, Any?> {
        return repo.cancelPushSchedule(id)
            ?: throw NotFoundException("Schedule $id not found or already processed")
    }
}
