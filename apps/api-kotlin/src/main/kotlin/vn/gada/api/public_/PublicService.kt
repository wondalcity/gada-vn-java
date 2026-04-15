package vn.gada.api.public_

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import vn.gada.api.common.database.DatabaseService

@Service
class PublicService(
    private val db: DatabaseService,
    @Value("\${gada.aws.cdn-domain:}") private val cdnDomain: String
) {

    private fun toProvinceSlug(code: String): String = code.lowercase()

    private fun toImageUrl(key: String?): String? {
        if (key == null) return null
        if (key.startsWith("http://") || key.startsWith("https://")) return key
        if (cdnDomain.isBlank()) return null
        val base = if (cdnDomain.startsWith("http")) cdnDomain else "https://$cdnDomain"
        return "$base/$key"
    }

    @Suppress("UNCHECKED_CAST")
    private fun toCoverImageUrl(keys: List<String>?, idx: Int?): String? {
        if (keys == null || keys.isEmpty()) return null
        val coverIdx = if (idx != null && idx >= 0 && idx < keys.size) idx else 0
        return toImageUrl(keys[coverIdx])
    }

    private fun toImageUrls(keys: List<String>?): List<String> {
        if (keys == null || keys.isEmpty()) return emptyList()
        return keys.mapNotNull { toImageUrl(it) }
    }

    fun listJobs(params: Map<String, Any?>): Map<String, Any?> {
        val page = ((params["page"] as? Number)?.toInt() ?: 1).coerceAtLeast(1)
        val limit = ((params["limit"] as? Number)?.toInt() ?: 20).coerceAtMost(50)
        val offset = (page - 1) * limit
        val lat = params["lat"] as? Double
        val lng = params["lng"] as? Double
        val useGeo = lat != null && lng != null
        val radiusKm = (params["radiusKm"] as? Double) ?: 50.0
        val statusFilter = params["statusFilter"] as? String

        val baseWhere = when (statusFilter) {
            "ALMOST_FULL" -> "j.status = 'OPEN' AND j.work_date >= CURRENT_DATE AND CAST(j.slots_filled AS FLOAT) / NULLIF(j.slots_total, 0) >= 0.8"
            "FILLED" -> "j.status = 'FILLED'"
            else -> "j.status = 'OPEN' AND j.work_date >= CURRENT_DATE"
        }

        val binds = mutableListOf<Any?>()
        val whereParts = mutableListOf(baseWhere)
        var idx = 1

        if (useGeo) {
            whereParts.add("ST_DWithin(s.location::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ${radiusKm * 1000})")
            binds.add(lng)
            binds.add(lat)
        }

        val province = params["province"] as? String
        if (province != null) {
            whereParts.add("LOWER(s.province) = LOWER(?)")
            binds.add(province)
        }

        val tradeId = params["tradeId"]?.let { (it as? Number)?.toInt() }
        if (tradeId != null) {
            whereParts.add("j.trade_id = ?")
            binds.add(tradeId)
        }

        val site = params["site"] as? String
        if (site != null) {
            whereParts.add("s.id::text = ?")
            binds.add(site)
        }

        val where = whereParts.joinToString(" AND ")
        val distanceExpr = if (useGeo)
            "ROUND((ST_Distance(s.location::geography, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) / 1000)::numeric, 1) AS distance_km,"
        else ""

        val orderBy = if (useGeo) "ORDER BY distance_km ASC, j.work_date ASC" else "ORDER BY j.work_date ASC, j.daily_wage DESC"

        val countSql = """SELECT COUNT(*) AS total FROM app.jobs j JOIN app.construction_sites s ON j.site_id = s.id WHERE $where"""

        val distanceBinds = if (useGeo) listOf(lng, lat) else emptyList()
        val dataSql = """
            SELECT
              j.id, j.slug, j.title, j.trade_id,
              j.work_date, j.start_time, j.end_time,
              j.daily_wage, j.slots_total, j.slots_filled,
              j.status, j.published_at,
              s.id             AS site_id,
              s.name           AS site_name,
              s.address,
              s.province,
              s.image_s3_keys  AS site_image_keys,
              s.cover_image_idx AS site_cover_idx,
              s.lat    AS site_lat,
              s.lng    AS site_lng,
              t.code AS trade_code,
              t.name_ko AS trade_name_ko,
              t.name_vi AS trade_name_vi,
              p.name_vi AS province_name_vi,
              p.name_en AS province_name_en
              ${if (useGeo) ", $distanceExpr" else ""}
              ${if (!useGeo) ", NULL AS _placeholder" else ""}
            FROM app.jobs j
            JOIN app.construction_sites s ON j.site_id = s.id
            LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
            LEFT JOIN ref.vn_provinces p ON UPPER(s.province) = p.code
            WHERE $where
            $orderBy
            LIMIT ? OFFSET ?
        """

        val countBinds = binds.toTypedArray()
        val dataBinds = (distanceBinds + binds + listOf(limit, offset)).toTypedArray()

        val countRows = db.queryForList(countSql, *countBinds)
        val dataRows = db.queryForList(dataSql, *dataBinds)

        val total = (countRows.firstOrNull()?.get("total") as? Number)?.toInt() ?: 0
        val jobs = dataRows.map { r ->
            val jobMap = mapJob(r)
            if (useGeo && r["distance_km"] != null) {
                jobMap + mapOf("distanceKm" to (r["distance_km"] as? Number)?.toDouble())
            } else {
                jobMap
            }
        }

        return mapOf(
            "jobs" to jobs,
            "total" to total,
            "page" to page,
            "totalPages" to Math.ceil(total.toDouble() / limit).toInt()
        )
    }

    fun getJobBySlug(slug: String): Map<String, Any?>? {
        val jobSql = """SELECT
                j.id, j.slug, j.title, j.description, j.trade_id,
                j.work_date, j.start_time, j.end_time,
                j.daily_wage, j.slots_total, j.slots_filled,
                j.status, j.published_at,
                j.benefits, j.requirements,
                s.id              AS site_id,
                s.name            AS site_name,
                s.address,
                s.province,
                s.lat,
                s.lng,
                s.image_s3_keys   AS site_image_keys,
                s.cover_image_idx  AS site_cover_idx,
                t.code AS trade_code,
                t.name_ko AS trade_name_ko,
                t.name_vi AS trade_name_vi,
                p.name_vi AS province_name_vi,
                p.name_en AS province_name_en
              FROM app.jobs j
              JOIN app.construction_sites s ON j.site_id = s.id
              LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
              LEFT JOIN ref.vn_provinces p ON UPPER(s.province) = p.code
              WHERE j.slug = ?"""
        // Try slug first (pass as raw string — no UUID coercion, slug is TEXT column)
        // then fall back to ID lookup (uses coerce() to send as UUID type)
        var rows = db.queryForListStr(jobSql, slug)
        if (rows.isEmpty()) {
            rows = db.queryForList(jobSql.replace("WHERE j.slug = ?", "WHERE j.id = ?"), slug)
        }
        if (rows.isEmpty()) return null

        val row = rows[0]

        // Related jobs
        val related = db.queryForList(
            """SELECT
                j.id, j.slug, j.title, j.trade_id,
                j.work_date, j.start_time, j.end_time,
                j.daily_wage, j.slots_total, j.slots_filled,
                j.status, j.published_at,
                s.id AS site_id, s.name AS site_name, s.address, s.province,
                s.image_s3_keys AS site_image_keys,
                s.cover_image_idx AS site_cover_idx,
                t.code AS trade_code,
                t.name_ko AS trade_name_ko,
                t.name_vi AS trade_name_vi,
                p.name_vi AS province_name_vi,
                p.name_en AS province_name_en
              FROM app.jobs j
              JOIN app.construction_sites s ON j.site_id = s.id
              LEFT JOIN ref.construction_trades t ON j.trade_id = t.id
              LEFT JOIN ref.vn_provinces p ON UPPER(s.province) = p.code
              WHERE j.trade_id = ?
                AND j.id != ?
                AND j.status = 'OPEN'
                AND j.work_date >= CURRENT_DATE
              ORDER BY j.work_date ASC
              LIMIT 4""",
            row["trade_id"], row["id"]
        )

        @Suppress("UNCHECKED_CAST")
        val benefitsMap = (row["benefits"] as? Map<String, Boolean>) ?: emptyMap()
        val benefits = benefitsMap.entries.filter { it.value }.map { it.key }

        @Suppress("UNCHECKED_CAST")
        val reqRaw = row["requirements"] as? Map<String, Any?>
        val requirementsObj = reqRaw?.let { req ->
            mapOf(
                "minExperienceMonths" to (req["minExperienceMonths"] ?: req["experience_months"]),
                "notes" to req["notes"]
            )
        }

        @Suppress("UNCHECKED_CAST")
        val siteImageKeys = row["site_image_keys"] as? List<String>
        val siteCoverIdx = (row["site_cover_idx"] as? Number)?.toInt()

        return mapJob(row) + mapOf(
            "descriptionKo" to row["description"],
            "descriptionVi" to row["description"],
            "benefits" to benefits,
            "requirementsObj" to requirementsObj,
            "site" to mapOf(
                "slug" to row["site_id"],
                "nameKo" to row["site_name"],
                "nameVi" to row["site_name"],
                "address" to row["address"],
                "province" to (row["province_name_vi"] ?: row["province"]),
                "provinceSlug" to toProvinceSlug((row["province"] as? String) ?: ""),
                "lat" to (row["lat"] as? Number)?.toDouble(),
                "lng" to (row["lng"] as? Number)?.toDouble(),
                "imageUrls" to toImageUrls(siteImageKeys),
                "coverImageUrl" to toCoverImageUrl(siteImageKeys, siteCoverIdx)
            ),
            "relatedJobs" to related.map { mapJob(it) }
        )
    }

    fun getSiteById(id: String): Map<String, Any?>? {
        val rows = db.queryForList(
            """SELECT
                s.id, s.name, s.address, s.province, s.lat, s.lng, s.site_type,
                s.image_s3_keys, s.cover_image_idx,
                p.name_vi AS province_name_vi,
                p.name_en AS province_name_en,
                mp.company_name,
                COUNT(j.id) FILTER (WHERE j.status = 'OPEN') AS active_job_count
              FROM app.construction_sites s
              LEFT JOIN ref.vn_provinces p ON UPPER(s.province) = p.code
              LEFT JOIN app.manager_profiles mp ON s.manager_id = mp.id
              LEFT JOIN app.jobs j ON j.site_id = s.id
              WHERE s.id = ?
              GROUP BY s.id, s.name, s.address, s.province, s.lat, s.lng, s.site_type,
                       s.image_s3_keys, s.cover_image_idx,
                       p.name_vi, p.name_en, mp.company_name""",
            id
        )
        if (rows.isEmpty()) return null

        val r = rows[0]
        @Suppress("UNCHECKED_CAST")
        val imageKeys = r["image_s3_keys"] as? List<String>
        val coverIdx = (r["cover_image_idx"] as? Number)?.toInt()

        return mapOf(
            "id" to r["id"],
            "slug" to r["id"],
            "nameKo" to r["name"],
            "nameVi" to r["name"],
            "address" to r["address"],
            "province" to (r["province_name_vi"] ?: r["province"]),
            "provinceSlug" to toProvinceSlug((r["province"] as? String) ?: ""),
            "siteType" to r["site_type"],
            "imageUrls" to toImageUrls(imageKeys),
            "coverImageUrl" to toCoverImageUrl(imageKeys, coverIdx),
            "lat" to (r["lat"] as? Number)?.toDouble(),
            "lng" to (r["lng"] as? Number)?.toDouble(),
            "managerCompany" to r["company_name"],
            "activeJobCount" to ((r["active_job_count"] as? Number)?.toInt() ?: 0)
        )
    }

    fun getProvinces(): List<Map<String, Any?>> {
        return db.queryForList(
            "SELECT code, name_vi, name_en FROM ref.vn_provinces ORDER BY name_vi"
        ).map { r ->
            mapOf(
                "code" to r["code"],
                "nameVi" to r["name_vi"],
                "nameEn" to r["name_en"],
                "slug" to toProvinceSlug((r["code"] as? String) ?: "")
            )
        }
    }

    fun getTrades(): List<Map<String, Any?>> {
        return db.queryForList(
            "SELECT id, code, name_ko, name_vi, name_en FROM ref.construction_trades ORDER BY id"
        ).map { r ->
            mapOf(
                "id" to r["id"],
                "code" to r["code"],
                "nameKo" to r["name_ko"],
                "nameVi" to r["name_vi"],
                "nameEn" to r["name_en"]
            )
        }
    }

    @Suppress("UNCHECKED_CAST")
    private fun mapJob(r: Map<String, Any?>): Map<String, Any?> {
        val siteImageKeys = r["site_image_keys"] as? List<String>
        val siteCoverIdx = (r["site_cover_idx"] as? Number)?.toInt()

        return mapOf(
            "id" to r["id"],
            "slug" to r["slug"],
            "titleKo" to r["title"],
            "titleVi" to r["title"],
            "tradeNameKo" to (r["trade_name_ko"] ?: ""),
            "tradeNameVi" to (r["trade_name_vi"] ?: ""),
            "provinceNameVi" to ((r["province_name_vi"] as? String) ?: (r["province"] as? String) ?: ""),
            "provinceSlug" to toProvinceSlug((r["province"] as? String) ?: ""),
            "siteSlug" to r["site_id"],
            "siteNameKo" to r["site_name"],
            "workDate" to r["work_date"],
            "startTime" to r["start_time"],
            "endTime" to r["end_time"],
            "dailyWage" to (r["daily_wage"] as? Number)?.toDouble(),
            "slotsTotal" to r["slots_total"],
            "slotsFilled" to r["slots_filled"],
            "status" to r["status"],
            "coverImageUrl" to toCoverImageUrl(siteImageKeys, siteCoverIdx),
            "publishedAt" to r["published_at"],
            "siteLat" to (r["site_lat"] as? Number)?.toDouble(),
            "siteLng" to (r["site_lng"] as? Number)?.toDouble(),
            "siteAddress" to r["address"]
        )
    }
}
