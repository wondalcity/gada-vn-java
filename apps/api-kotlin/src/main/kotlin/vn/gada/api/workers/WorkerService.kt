package vn.gada.api.workers

import org.springframework.stereotype.Service

@Service
class WorkerService(private val repo: WorkerRepository) {

    fun getProfile(userId: String): Map<String, Any?> {
        return repo.findByUserId(userId)
            ?: mapOf("userId" to userId, "fullName" to null, "experienceMonths" to 0)
    }

    fun updateProfile(userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        return repo.updateByUserId(userId, data)
    }

    fun getHires(userId: String): List<Map<String, Any?>> {
        return repo.findHiresByUserId(userId)
    }

    fun getAttendance(userId: String, jobId: String?): List<Map<String, Any?>> {
        return repo.findAttendanceByUserId(userId, jobId)
    }

    fun getTradeSkills(userId: String): List<Map<String, Any?>> {
        return repo.findTradeSkillsByUserId(userId)
    }

    fun updateTradeSkills(userId: String, body: Map<String, Any?>): List<Map<String, Any?>> {
        @Suppress("UNCHECKED_CAST")
        val skills = body["skills"] as? List<Map<String, Any?>> ?: emptyList()
        return repo.updateTradeSkillsByUserId(userId, skills)
    }
}
