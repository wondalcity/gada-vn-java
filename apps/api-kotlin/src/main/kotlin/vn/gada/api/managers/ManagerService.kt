package vn.gada.api.managers

import org.springframework.stereotype.Service

@Service
class ManagerService(private val repo: ManagerRepository) {

    fun register(userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        return repo.upsert(userId, data)
    }

    fun getRegistrationStatus(userId: String): Map<String, Any?> {
        return repo.findRegistrationStatus(userId)
    }

    fun getProfile(userId: String): Map<String, Any?>? {
        return repo.findByUserId(userId)
    }

    fun updateProfile(userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        return repo.updateByUserId(userId, data)
    }
}
