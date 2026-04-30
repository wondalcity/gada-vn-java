package vn.gada.api.attendance

import org.springframework.stereotype.Service
import vn.gada.api.common.exception.NotFoundException
import vn.gada.api.notifications.NotificationService
import java.time.LocalDate

@Service
class AttendanceService(
    private val repo: AttendanceRepository,
    private val notifications: NotificationService
) {

    fun findByJob(jobId: String, managerUserId: String): List<Map<String, Any?>> {
        return repo.findByJobId(jobId, managerUserId)
    }

    fun update(
        id: String,
        managerUserId: String,
        status: String,
        notes: String?
    ): Map<String, Any?>? {
        val record = repo.findById(id)
            ?: throw NotFoundException("Attendance record $id not found")

        val updated = repo.update(id, managerUserId, status, notes)

        // Notify worker — fire-and-forget
        try {
            val workerUserId = repo.findWorkerUserIdByRecord(id)
            if (workerUserId != null) {
                val statusLabel = if (status == "ATTENDED") "출근 확인" else "결근 처리"
                notifications.send(
                    userId = workerUserId,
                    type = "ATTENDANCE_MARKED",
                    title = "출역 현황 업데이트: $statusLabel",
                    body = "${LocalDate.now()} 출역 현황이 업데이트되었습니다.",
                    data = mapOf("attendanceId" to id, "status" to status)
                )
            }
        } catch (e: Exception) {
            // Ignore notification errors
        }

        return updated
    }

    fun bulkUpsert(
        jobId: String,
        managerUserId: String,
        records: List<Map<String, Any?>>
    ): List<Map<String, Any?>> {
        return repo.bulkUpsert(jobId, managerUserId, records)
    }

    fun getStatusHistory(attendanceId: String): List<Map<String, Any?>> {
        return repo.getStatusHistory(attendanceId)
    }
}
