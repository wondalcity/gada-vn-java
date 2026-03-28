package vn.gada.api.workers

import org.springframework.stereotype.Service

@Service
class WorkerService(private val repo: WorkerRepository) {

    fun getProfile(userId: String): Map<String, Any?> {
        return repo.findByUserId(userId)
            ?: mapOf("user_id" to userId, "full_name" to null, "experience_months" to 0, "trade_ids" to emptyList<Any>())
    }

    fun updateProfile(userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        val fullName = data["fullName"]
        val experienceMonths = data["experienceMonths"]
        return repo.updateByUserId(userId, fullName, experienceMonths)
    }

    fun getHires(userId: String): List<Map<String, Any?>> {
        return repo.findHiresByUserId(userId)
    }

    fun getAttendance(userId: String, jobId: String?): List<Map<String, Any?>> {
        return repo.findAttendanceByUserId(userId, jobId)
    }
}
