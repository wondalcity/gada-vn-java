package vn.gada.api.jobs

import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.stereotype.Repository
import vn.gada.api.common.database.DatabaseService
import vn.gada.api.common.exception.NotFoundException

@Repository
class JobRepository(
    private val db: DatabaseService,
    private val objectMapper: ObjectMapper
) {

    data class JobListQuery(
        val lat: Double? = null,
        val lng: Double? = null,
        val radiusKm: Int = 50,
        val page: Int = 1,
        val limit: Int = 20,
        val tradeId: Int? = null,
        val province: String? = null
    )

    fun findMany(query: JobListQuery): List<Map<String, Any?>> {
        val offset = (query.page - 1) * query.limit
        val useGeo = query.lat != null && query.lng != null

        val params = mutableListOf<Any?>()
        val sb = StringBuilder()

        sb.append("SELECT j.*, s.name as site_name, s.address, s.province, s.lat, s.lng ")
        if (useGeo) {
            sb.append(", ST_Distance(s.location::geography, ST_MakePoint(?, ?)::geography) / 1000 as distance_km ")
            params.add(query.lng)
            params.add(query.lat)
        }
        sb.append("FROM app.jobs j ")
        sb.append("JOIN app.construction_sites s ON j.site_id = s.id ")
        sb.append("WHERE j.status = 'OPEN' AND j.work_date >= CURRENT_DATE ")

        if (useGeo) {
            sb.append("AND ST_DWithin(s.location::geography, ST_MakePoint(?, ?)::geography, ${query.radiusKm * 1000}) ")
            params.add(query.lng)
            params.add(query.lat)
        }

        if (query.tradeId != null) {
            sb.append("AND j.trade_id = ? ")
            params.add(query.tradeId)
        }
        if (query.province != null) {
            sb.append("AND s.province = ? ")
            params.add(query.province)
        }

        if (useGeo) {
            sb.append("ORDER BY distance_km ASC ")
        } else {
            sb.append("ORDER BY j.daily_wage DESC ")
        }

        sb.append("LIMIT ? OFFSET ?")
        params.add(query.limit)
        params.add(offset)

        return db.queryForList(sb.toString(), *params.toTypedArray())
    }

    fun findByDate(date: String, page: Int = 1, limit: Int = 20): List<Map<String, Any?>> {
        val offset = (page - 1) * limit
        return db.queryForList(
            """SELECT j.*, s.name as site_name, s.address
               FROM app.jobs j
               JOIN app.construction_sites s ON j.site_id = s.id
               WHERE j.work_date = ? AND j.status = 'OPEN'
               ORDER BY j.daily_wage DESC
               LIMIT ? OFFSET ?""",
            date, limit, offset
        )
    }

    fun findById(id: String): Map<String, Any?>? {
        val rows = db.queryForList(
            """SELECT j.*, s.name as site_name, s.address, s.province, s.lat, s.lng
               FROM app.jobs j
               JOIN app.construction_sites s ON j.site_id = s.id
               WHERE j.id = ?""",
            id
        )
        return rows.firstOrNull()
    }

    fun getManagerIdByUserId(userId: String): String {
        val rows = db.queryForList(
            "SELECT id FROM app.manager_profiles WHERE user_id = ?",
            userId
        )
        if (rows.isEmpty()) throw NotFoundException("Manager profile not found")
        return rows[0]["id"] as String
    }

    fun create(managerId: String, data: Map<String, Any?>): Map<String, Any?>? {
        val benefitsJson = objectMapper.writeValueAsString(data["benefits"] ?: emptyMap<String, Any>())
        val requirementsJson = objectMapper.writeValueAsString(data["requirements"] ?: emptyMap<String, Any>())
        val slug = (data["title"] as? String ?: "job")
            .lowercase()
            .replace(Regex("[^a-z0-9\\s-]"), "")
            .trim()
            .replace(Regex("\\s+"), "-")
            .take(80) + "-" + System.currentTimeMillis().toString(36)

        val rows = db.queryForListRaw(
            """INSERT INTO app.jobs (
                site_id, manager_id, title, description, trade_id,
                work_date, start_time, end_time, daily_wage,
                benefits, requirements, slots_total, expires_at, status, slug, published_at
               ) VALUES (?,?,?,?,?,CAST(? AS date),CAST(? AS time),CAST(? AS time),?,CAST(? AS jsonb),CAST(? AS jsonb),?,CAST(? AS timestamptz),'OPEN',?,NOW())
               RETURNING *""",
            data["siteId"], managerId, data["title"], data["description"], data["tradeId"],
            data["workDate"], data["startTime"], data["endTime"], data["dailyWage"],
            benefitsJson, requirementsJson,
            data["slotsTotal"], data["expiresAt"],
            slug
        )
        return rows.firstOrNull()
    }

    fun update(id: String, managerId: String, data: Map<String, Any?>): Map<String, Any?>? {
        val benefitsJson = data["benefits"]?.let { objectMapper.writeValueAsString(it) }
        val requirementsJson = data["requirements"]?.let { objectMapper.writeValueAsString(it) }
        val rows = db.queryForListRaw(
            """UPDATE app.jobs SET
                title        = COALESCE(?, title),
                description  = COALESCE(?, description),
                trade_id     = COALESCE(?, trade_id),
                work_date    = COALESCE(CAST(? AS date), work_date),
                start_time   = COALESCE(CAST(? AS time), start_time),
                end_time     = COALESCE(CAST(? AS time), end_time),
                daily_wage   = COALESCE(?, daily_wage),
                benefits     = COALESCE(CAST(? AS jsonb), benefits),
                requirements = COALESCE(CAST(? AS jsonb), requirements),
                slots_total  = COALESCE(?, slots_total),
                expires_at   = COALESCE(CAST(? AS timestamptz), expires_at),
                status       = COALESCE(?, status),
                updated_at   = NOW()
               WHERE id = ? AND manager_id = ?
               RETURNING *""",
            data["title"], data["description"], data["tradeId"],
            data["workDate"], data["startTime"], data["endTime"],
            data["dailyWage"],
            benefitsJson, requirementsJson,
            data["slotsTotal"], data["expiresAt"], data["status"],
            id, managerId
        )
        return rows.firstOrNull()
    }

    fun findByManager(managerId: String): List<Map<String, Any?>> {
        return db.queryForList(
            """SELECT j.*, s.name as site_name, s.address
               FROM app.jobs j
               JOIN app.construction_sites s ON j.site_id = s.id
               WHERE j.manager_id = ?
               ORDER BY j.work_date DESC""",
            managerId
        )
    }

    fun softDelete(id: String, managerId: String) {
        db.updateRaw(
            "UPDATE app.jobs SET status = 'CANCELLED', updated_at = NOW() WHERE id = ? AND manager_id = ?",
            id, managerId
        )
    }
}
