package vn.gada.api.admin

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import vn.gada.api.auth.AuthRepository
import vn.gada.api.auth.AuthService
import vn.gada.api.common.exception.BadRequestException
import vn.gada.api.common.exception.NotFoundException
import vn.gada.api.notifications.NotificationService

@Service
class AdminService(
    private val repo: AdminRepository,
    private val authRepo: AuthRepository,
    private val authService: AuthService,
    private val notifications: NotificationService,
    @Value("\${spring.profiles.active:default}") private val activeProfile: String
) {
    private val log = LoggerFactory.getLogger(AdminService::class.java)
    private val isDev: Boolean get() = activeProfile != "production" && activeProfile != "prod"

    // ── Managers ─────────────────────────────────────────────────────────────

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

    fun revokeManager(id: String): Map<String, Any?>? {
        repo.findManagerById(id) ?: throw NotFoundException("Manager $id not found")
        return repo.revokeManager(id)
    }

    fun updateManager(id: String, body: Map<String, Any?>): Map<String, Any?> {
        repo.findManagerById(id) ?: throw NotFoundException("Manager $id not found")
        return repo.updateManager(id, body) ?: throw NotFoundException("Manager $id not found")
    }

    fun promoteWorkerToManager(workerId: String, companyName: String, phone: String): Map<String, Any?>? {
        return repo.promoteWorkerToManager(workerId, companyName, phone)
            ?: throw NotFoundException("Worker $workerId not found")
    }

    fun getManagerSites(managerId: String): List<Map<String, Any?>> {
        return repo.findManagerSites(managerId)
    }

    fun assignSiteToManager(managerId: String, siteId: String): Map<String, Any?>? {
        return repo.assignSiteToManager(managerId, siteId)
    }

    fun unassignSiteFromManager(managerId: String, siteId: String): Map<String, Any?> {
        val deleted = repo.unassignSiteFromManager(managerId, siteId)
        return mapOf("deleted" to deleted)
    }

    // ── Workers ───────────────────────────────────────────────────────────────

    fun searchWorkers(search: String, page: Int, limit: Int): Map<String, Any?> {
        val data = repo.searchWorkers(search, page, limit)
        val total = repo.countWorkers(search)
        return mapOf("data" to data, "total" to total, "page" to page, "limit" to limit)
    }

    fun getWorker(id: String): Map<String, Any?> {
        return repo.findWorkerById(id) ?: throw NotFoundException("Worker $id not found")
    }

    fun createWorker(phone: String, fullName: String): Map<String, Any?>? {
        if (phone.isBlank()) throw BadRequestException("phone is required")
        if (fullName.isBlank()) throw BadRequestException("fullName is required")
        return repo.createWorker(phone, fullName)
    }

    fun updateWorker(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        repo.findWorkerById(id) ?: throw NotFoundException("Worker $id not found")
        return repo.updateWorker(id, body)
    }

    fun deleteWorker(id: String): Map<String, Any?> {
        repo.findWorkerById(id) ?: throw NotFoundException("Worker $id not found")
        val deleted = repo.deleteWorker(id)
        return mapOf("deleted" to deleted)
    }

    fun getWorkerTradeSkills(workerId: String): List<Map<String, Any?>> {
        repo.findWorkerById(workerId) ?: throw NotFoundException("Worker $workerId not found")
        return repo.findWorkerTradeSkills(workerId)
    }

    fun updateWorkerTradeSkills(workerId: String, body: Map<String, Any?>): List<Map<String, Any?>> {
        repo.findWorkerById(workerId) ?: throw NotFoundException("Worker $workerId not found")
        @Suppress("UNCHECKED_CAST")
        val skills = body["skills"] as? List<Map<String, Any?>> ?: emptyList()
        return repo.updateWorkerTradeSkills(workerId, skills)
    }

    // ── Jobs ──────────────────────────────────────────────────────────────────

    fun listJobs(status: String?, page: Int, limit: Int): Map<String, Any?> {
        val data = repo.findJobsPaginated(status, page, limit)
        val total = repo.countJobs(status)
        return mapOf("data" to data, "total" to total, "page" to page, "limit" to limit)
    }

    fun getJobWithRoster(jobId: String): Map<String, Any?> {
        val job = repo.findJobById(jobId) ?: throw NotFoundException("Job $jobId not found")
        val roster = repo.findJobRoster(jobId)
        return mapOf("job" to job, "roster" to roster)
    }

    fun createJob(body: Map<String, Any?>): Map<String, Any?>? {
        return repo.createJob(body)
    }

    fun updateJob(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        return repo.updateJob(id, body)
    }

    fun deleteJob(id: String): Map<String, Any?> {
        val deleted = repo.deleteJob(id)
        return mapOf("deleted" to deleted)
    }

    fun acceptApplication(applicationId: String): Map<String, Any?>? {
        return repo.updateApplicationStatus(applicationId, "ACCEPTED")
            ?: throw NotFoundException("Application $applicationId not found")
    }

    fun rejectApplication(applicationId: String): Map<String, Any?>? {
        return repo.updateApplicationStatus(applicationId, "REJECTED")
            ?: throw NotFoundException("Application $applicationId not found")
    }

    fun resetApplication(applicationId: String): Map<String, Any?>? {
        return repo.updateApplicationStatus(applicationId, "PENDING")
            ?: throw NotFoundException("Application $applicationId not found")
    }

    // ── Sites ─────────────────────────────────────────────────────────────────

    fun listSites(): List<Map<String, Any?>> {
        return repo.findAllSites()
    }

    fun getSite(id: String): Map<String, Any?> {
        return repo.findSiteById(id) ?: throw NotFoundException("Site $id not found")
    }

    fun createSite(body: Map<String, Any?>): Map<String, Any?>? {
        return repo.createSite(body)
    }

    fun updateSite(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        repo.findSiteById(id) ?: throw NotFoundException("Site $id not found")
        return repo.updateSite(id, body)
    }

    fun deleteSite(id: String): Map<String, Any?> {
        repo.findSiteById(id) ?: throw NotFoundException("Site $id not found")
        val deleted = repo.deleteSite(id)
        return mapOf("deleted" to deleted)
    }

    // ── Companies ─────────────────────────────────────────────────────────────

    fun listCompanies(): List<Map<String, Any?>> {
        return repo.findAllCompanies()
    }

    fun getCompany(id: String): Map<String, Any?> {
        return repo.findCompanyById(id) ?: throw NotFoundException("Company $id not found")
    }

    fun createCompany(body: Map<String, Any?>): Map<String, Any?>? {
        return repo.createCompany(body)
    }

    fun updateCompany(id: String, body: Map<String, Any?>): Map<String, Any?>? {
        repo.findCompanyById(id) ?: throw NotFoundException("Company $id not found")
        return repo.updateCompany(id, body)
    }

    fun deleteCompany(id: String): Map<String, Any?> {
        repo.findCompanyById(id) ?: throw NotFoundException("Company $id not found")
        val deleted = repo.deleteCompany(id)
        return mapOf("deleted" to deleted)
    }

    // ── Trades ────────────────────────────────────────────────────────────────

    fun listTrades(): List<Map<String, Any?>> {
        return repo.findAllTrades()
    }

    // ── Notifications ─────────────────────────────────────────────────────────

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
        val scheduledAt = data["scheduledAt"] as? String ?: throw BadRequestException("scheduledAt is required")
        return repo.createPushSchedule(title, body, targetUserIds, targetRole, scheduledAt)
    }

    fun cancelPushSchedule(id: String): Map<String, Any?> {
        return repo.cancelPushSchedule(id)
            ?: throw NotFoundException("Schedule $id not found or already processed")
    }

    // ── Test Accounts ─────────────────────────────────────────────────────────

    fun listTestAccounts(): List<Map<String, Any?>> {
        return authRepo.listTestAccounts()
    }

    fun createTestAccount(phone: String, role: String, name: String): Map<String, Any?> {
        val normalized = authService.normalizePhone(phone)
        return authRepo.createTestAccount(normalized, role, name)
    }

    fun deleteTestAccount(id: String): Map<String, Any?> {
        val deleted = authRepo.deleteTestAccount(id)
        return mapOf("deleted" to deleted)
    }
}
