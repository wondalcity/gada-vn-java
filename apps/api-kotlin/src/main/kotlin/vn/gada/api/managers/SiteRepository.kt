package vn.gada.api.managers

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService
import vn.gada.api.common.exception.BadRequestException
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.NotFoundException
import vn.gada.api.files.FileService

private const val MAX_IMAGES = 10

@Repository
class SiteRepository(
    private val db: DatabaseService,
    private val fileService: FileService,
    @Value("\${gada.aws.cdn-domain:}") private val cdnDomain: String
) {

    private fun toImageUrl(key: String?): String? {
        if (key == null) return null
        if (key.startsWith("http://") || key.startsWith("https://") || key.startsWith("data:")) return key
        if (cdnDomain.isNotBlank()) {
            val base = if (cdnDomain.startsWith("http")) cdnDomain else "https://$cdnDomain"
            return "$base/$key"
        }
        // No CDN domain configured — generate a presigned GET URL as fallback
        return fileService.toPublicUrl(key)
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapSite(r: Map<String, Any?>): Map<String, Any?> {
        val keys = (r["image_s3_keys"] as? List<String>) ?: emptyList()
        val coverIdx = (r["cover_image_idx"] as? Number)?.toInt() ?: 0
        val validCoverIdx = if (coverIdx >= 0 && coverIdx < keys.size) coverIdx else 0
        val imageUrls = keys.mapNotNull { toImageUrl(it) }
        return mapOf(
            "id" to r["id"],
            "name" to r["name"],
            "address" to r["address"],
            "province" to r["province"],
            "district" to r["district"],
            "lat" to (r["lat"] as? Number)?.toDouble(),
            "lng" to (r["lng"] as? Number)?.toDouble(),
            "siteType" to r["site_type"],
            "status" to r["status"],
            "coverImageUrl" to (imageUrls.getOrNull(validCoverIdx)),
            "coverImageIdx" to validCoverIdx,
            "imageUrls" to imageUrls,
            "jobCount" to ((r["job_count"] as? Number)?.toInt() ?: 0),
            "companyId" to r["company_id"],
            "companyName" to r["company_name"],
            "createdAt" to r["created_at"],
            "updatedAt" to r["updated_at"]
        )
    }

    private fun getManagerId(userId: String): String {
        val rows = db.queryForList(
            "SELECT id FROM app.manager_profiles WHERE user_id = ?",
            userId
        )
        if (rows.isEmpty()) throw ForbiddenException("Manager profile not found")
        return rows[0]["id"] as String
    }

    fun listByUser(userId: String): List<Map<String, Any?>> {
        val managerId = getManagerId(userId)
        val rows = db.queryForList(
            """SELECT s.*,
                      cc.name AS company_name,
                      COUNT(j.id) FILTER (WHERE j.status = 'OPEN') AS job_count
               FROM app.construction_sites s
               LEFT JOIN app.jobs j ON j.site_id = s.id
               LEFT JOIN app.construction_companies cc ON cc.id = s.company_id
               WHERE s.manager_id = ?
               GROUP BY s.id, cc.name
               ORDER BY s.created_at DESC""",
            managerId
        )
        return rows.map { mapSite(it) }
    }

    fun findOne(siteId: String, userId: String): Map<String, Any?> {
        val managerId = getManagerId(userId)
        val rows = db.queryForList(
            """SELECT s.*,
                      cc.name AS company_name,
                      COUNT(j.id) FILTER (WHERE j.status = 'OPEN') AS job_count
               FROM app.construction_sites s
               LEFT JOIN app.jobs j ON j.site_id = s.id
               LEFT JOIN app.construction_companies cc ON cc.id = s.company_id
               WHERE s.id = ? AND s.manager_id = ?
               GROUP BY s.id, cc.name""",
            siteId, managerId
        )
        if (rows.isEmpty()) throw NotFoundException("Site not found")
        return mapSite(rows[0])
    }

    fun create(
        userId: String,
        name: String,
        address: String,
        province: String,
        district: String?,
        lat: Double?,
        lng: Double?,
        siteType: String?,
        companyId: String? = null
    ): Map<String, Any?> {
        val managerId = getManagerId(userId)
        val rows = db.queryForList(
            """INSERT INTO app.construction_sites
                 (manager_id, name, address, province, district, lat, lng, site_type, company_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
               RETURNING *, NULL::text AS company_name""",
            managerId, name, address, province, district, lat, lng, siteType,
            if (companyId.isNullOrBlank()) null else companyId
        )
        val row = rows.first().toMutableMap()
        // Fetch company name if linked
        if (companyId != null) {
            val co = db.queryForList("SELECT name FROM app.construction_companies WHERE id = ?", companyId)
            row["company_name"] = co.firstOrNull()?.get("name")
        }
        row["job_count"] = 0
        return mapSite(row)
    }

    fun update(
        siteId: String,
        userId: String,
        name: String?,
        address: String?,
        province: String?,
        district: String?,
        lat: Double?,
        lng: Double?,
        siteType: String?,
        status: String?,
        companyId: String? = null
    ): Map<String, Any?> {
        val managerId = getManagerId(userId)
        val rows = db.queryForListRaw(
            """UPDATE app.construction_sites SET
                 name       = COALESCE(?, name),
                 address    = COALESCE(?, address),
                 province   = COALESCE(?, province),
                 district   = COALESCE(?, district),
                 lat        = COALESCE(?, lat),
                 lng        = COALESCE(?, lng),
                 site_type  = COALESCE(?, site_type),
                 status     = COALESCE(?, status),
                 company_id = COALESCE(?::uuid, company_id),
                 updated_at = NOW()
               WHERE id = ? AND manager_id = ?
               RETURNING *""",
            name, address, province, district, lat, lng, siteType, status,
            companyId, siteId, managerId
        )
        if (rows.isEmpty()) throw NotFoundException("Site not found")
        val row = rows.first().toMutableMap()
        // Fetch company name
        val effectiveCompanyId = row["company_id"] as? String
        if (effectiveCompanyId != null) {
            val co = db.queryForList("SELECT name FROM app.construction_companies WHERE id = ?", effectiveCompanyId)
            row["company_name"] = co.firstOrNull()?.get("name")
        } else {
            row["company_name"] = null
        }
        row["job_count"] = 0
        return mapSite(row)
    }

    @Suppress("UNCHECKED_CAST")
    fun addImage(siteId: String, userId: String, key: String): Map<String, Any?> {
        val managerId = getManagerId(userId)
        val cur = db.queryForList(
            "SELECT image_s3_keys, manager_id FROM app.construction_sites WHERE id = ?",
            siteId
        )
        if (cur.isEmpty()) throw NotFoundException("Site not found")
        val curRow = cur[0]
        if ((curRow["manager_id"] as? String) != managerId) throw ForbiddenException("Forbidden")
        val existingKeys = (curRow["image_s3_keys"] as? List<String>) ?: emptyList()
        if (existingKeys.size >= MAX_IMAGES) {
            throw BadRequestException("최대 ${MAX_IMAGES}장까지 등록할 수 있습니다")
        }

        val rows = db.queryForList(
            """UPDATE app.construction_sites
               SET image_s3_keys = array_append(image_s3_keys, ?), updated_at = NOW()
               WHERE id = ? AND manager_id = ?
               RETURNING image_s3_keys, cover_image_idx""",
            key, siteId, managerId
        )
        if (rows.isEmpty()) throw NotFoundException("Site not found")
        val r = rows[0]
        val keys = (r["image_s3_keys"] as? List<String>) ?: emptyList()
        val coverIdx = (r["cover_image_idx"] as? Number)?.toInt() ?: 0
        return mapOf(
            "imageUrls" to keys.mapNotNull { toImageUrl(it) },
            "coverImageIdx" to coverIdx,
            "coverImageUrl" to toImageUrl(keys.getOrNull(coverIdx))
        )
    }

    @Suppress("UNCHECKED_CAST")
    fun removeImage(siteId: String, userId: String, index: Int): Map<String, Any?> {
        val managerId = getManagerId(userId)
        val cur = db.queryForList(
            "SELECT image_s3_keys, cover_image_idx, manager_id FROM app.construction_sites WHERE id = ?",
            siteId
        )
        if (cur.isEmpty()) throw NotFoundException("Site not found")
        val curRow = cur[0]
        if ((curRow["manager_id"] as? String) != managerId) throw ForbiddenException("Forbidden")
        val keys = (curRow["image_s3_keys"] as? List<String>) ?: emptyList()
        if (index < 0 || index >= keys.size) throw BadRequestException("Invalid image index")

        val pgIdx = index + 1
        var newCoverIdx = (curRow["cover_image_idx"] as? Number)?.toInt() ?: 0
        newCoverIdx = when {
            newCoverIdx == index -> 0
            newCoverIdx > index -> newCoverIdx - 1
            else -> newCoverIdx
        }

        val rows = db.queryForList(
            """UPDATE app.construction_sites
               SET image_s3_keys = (
                     image_s3_keys[1:?-1] ||
                     image_s3_keys[?+1:array_length(image_s3_keys, 1)]
                   ),
                   cover_image_idx = ?,
                   updated_at = NOW()
               WHERE id = ? AND manager_id = ?
               RETURNING image_s3_keys, cover_image_idx""",
            pgIdx, pgIdx, newCoverIdx, siteId, managerId
        )
        if (rows.isEmpty()) throw NotFoundException("Site not found")
        val r = rows[0]
        val newKeys = (r["image_s3_keys"] as? List<String>) ?: emptyList()
        val finalCoverIdx = (r["cover_image_idx"] as? Number)?.toInt() ?: 0
        return mapOf(
            "imageUrls" to newKeys.mapNotNull { toImageUrl(it) },
            "coverImageIdx" to finalCoverIdx,
            "coverImageUrl" to toImageUrl(newKeys.getOrNull(finalCoverIdx))
        )
    }

    @Suppress("UNCHECKED_CAST")
    fun setCover(siteId: String, userId: String, index: Int): Map<String, Any?> {
        val managerId = getManagerId(userId)
        val cur = db.queryForList(
            "SELECT image_s3_keys, manager_id FROM app.construction_sites WHERE id = ?",
            siteId
        )
        if (cur.isEmpty()) throw NotFoundException("Site not found")
        val curRow = cur[0]
        if ((curRow["manager_id"] as? String) != managerId) throw ForbiddenException("Forbidden")
        val keys = (curRow["image_s3_keys"] as? List<String>) ?: emptyList()
        if (index < 0 || index >= keys.size) throw BadRequestException("Invalid image index")

        db.updateRaw(
            "UPDATE app.construction_sites SET cover_image_idx = ?, updated_at = NOW() WHERE id = ? AND manager_id = ?",
            index, siteId, managerId
        )
        return mapOf(
            "coverImageIdx" to index,
            "coverImageUrl" to toImageUrl(keys.getOrNull(index))
        )
    }

    fun getJobs(siteId: String, userId: String): List<Map<String, Any?>> {
        val managerId = getManagerId(userId)
        return db.queryForList(
            """SELECT j.id, j.title, j.work_date, j.daily_wage, j.slots_total, j.slots_filled,
                      j.status, j.slug, j.published_at, j.created_at, j.updated_at
               FROM app.jobs j
               JOIN app.construction_sites s ON j.site_id = s.id
               WHERE j.site_id = ? AND s.manager_id = ?
               ORDER BY j.work_date DESC""",
            siteId, managerId
        )
    }
}
