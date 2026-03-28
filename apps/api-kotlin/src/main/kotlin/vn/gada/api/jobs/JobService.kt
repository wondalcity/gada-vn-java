package vn.gada.api.jobs

import org.springframework.stereotype.Service
import vn.gada.api.common.cache.CacheService
import vn.gada.api.common.exception.NotFoundException

private const val GEO_CACHE_TTL = 300L

@Service
class JobService(
    private val repo: JobRepository,
    private val cache: CacheService
) {

    fun listJobs(query: JobRepository.JobListQuery): Any {
        val cacheKey = geoKey(query)
        val cached = cache.get(cacheKey)
        if (cached != null) return cached

        val result = repo.findMany(query)
        cache.set(cacheKey, result, GEO_CACHE_TTL)
        return result
    }

    fun getDailyFeed(date: String, page: Int = 1, limit: Int = 20): Any {
        val cacheKey = "jobs:daily:$date:p$page:l$limit"
        val cached = cache.get(cacheKey)
        if (cached != null) return cached

        val result = repo.findByDate(date, page, limit)
        cache.set(cacheKey, result, GEO_CACHE_TTL)
        return result
    }

    fun getJobById(id: String): Map<String, Any?> {
        val cacheKey = "jobs:id:$id"
        @Suppress("UNCHECKED_CAST")
        val cached = cache.get(cacheKey) as? Map<String, Any?>
        if (cached != null) return cached

        val job = repo.findById(id) ?: throw NotFoundException("Job $id not found")
        cache.set(cacheKey, job, GEO_CACHE_TTL)
        return job
    }

    fun getMyJobs(userId: String): List<Map<String, Any?>> {
        val managerId = repo.getManagerIdByUserId(userId)
        return repo.findByManager(managerId)
    }

    fun createJob(userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        val managerId = repo.getManagerIdByUserId(userId)
        val job = repo.create(managerId, data)
        cache.delPattern("jobs:geo:*")
        cache.delPattern("jobs:daily:*")
        return job
    }

    fun updateJob(id: String, userId: String, data: Map<String, Any?>): Map<String, Any?>? {
        val managerId = repo.getManagerIdByUserId(userId)
        val job = repo.update(id, managerId, data)
        cache.del("jobs:id:$id")
        cache.delPattern("jobs:geo:*")
        return job
    }

    fun deleteJob(id: String, userId: String): Map<String, Any> {
        val managerId = repo.getManagerIdByUserId(userId)
        repo.softDelete(id, managerId)
        cache.del("jobs:id:$id")
        cache.delPattern("jobs:geo:*")
        return mapOf("success" to true)
    }

    private fun geoKey(query: JobRepository.JobListQuery): String {
        val lat = query.lat?.let { String.format("%.2f", it) } ?: "x"
        val lng = query.lng?.let { String.format("%.2f", it) } ?: "x"
        val radius = query.radiusKm
        return "jobs:geo:$lat:$lng:$radius"
    }
}
