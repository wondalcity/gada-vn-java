package vn.gada.api.applications

import org.springframework.stereotype.Service
import vn.gada.api.common.exception.ConflictException
import vn.gada.api.common.exception.NotFoundException
import vn.gada.api.notifications.NotificationService

@Service
class ApplicationService(
    private val repo: ApplicationRepository,
    private val notifications: NotificationService
) {

    fun findOneByWorker(id: String, userId: String): Map<String, Any?> {
        return repo.findByIdAndWorker(id, userId)
            ?: throw NotFoundException("Application $id not found")
    }

    fun withdraw(id: String, userId: String): Map<String, Any?> {
        return repo.withdrawByWorker(id, userId)
            ?: throw NotFoundException("Application $id not found or cannot be withdrawn")
    }

    fun apply(userId: String, jobId: String): Map<String, Any?>? {
        val existing = repo.findByWorkerAndJob(userId, jobId)
        if (existing != null) throw ConflictException("Already applied to this job")
        return repo.create(userId, jobId)
    }

    fun findByWorker(userId: String, page: Int, limit: Int): List<Map<String, Any?>> {
        return repo.findByWorkerUserId(userId, page, limit)
    }

    fun findByJob(jobId: String, managerUserId: String): List<Map<String, Any?>> {
        return repo.findByJobId(jobId, managerUserId)
    }

    fun findByManager(managerUserId: String): List<Map<String, Any?>> {
        return repo.findByManagerUserId(managerUserId)
    }

    fun hire(id: String, managerUserId: String): Map<String, Any?>? {
        return updateStatus(id, managerUserId, "ACCEPTED")
    }

    fun reject(id: String, managerUserId: String): Map<String, Any?>? {
        return updateStatus(id, managerUserId, "REJECTED")
    }

    fun updateStatus(id: String, managerUserId: String, status: String): Map<String, Any?>? {
        val application = repo.findById(id)
            ?: throw NotFoundException("Application $id not found")

        val updated = repo.updateStatus(id, managerUserId, status)

        // Notify worker on status change — fire-and-forget, non-fatal
        if (status == "ACCEPTED" || status == "REJECTED") {
            try {
                val workerUserId = repo.findWorkerUserIdByApplication(id)
                if (workerUserId != null) {
                    val isAccepted = status == "ACCEPTED"
                    notifications.send(
                        userId = workerUserId,
                        type = if (isAccepted) "APPLICATION_ACCEPTED" else "APPLICATION_REJECTED",
                        title = if (isAccepted) "지원이 수락되었습니다 ✅" else "지원 결과 안내",
                        body = if (isAccepted)
                            "축하합니다! 지원이 수락되었습니다. 계약서를 확인해 주세요."
                        else
                            "아쉽게도 이번 일자리 지원이 수락되지 않았습니다.",
                        data = mapOf("applicationId" to id)
                    )
                }
            } catch (e: Exception) {
                // Ignore notification errors
            }
        }

        return updated
    }
}
