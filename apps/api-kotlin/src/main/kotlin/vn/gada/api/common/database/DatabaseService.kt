package vn.gada.api.common.database

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import javax.sql.DataSource

@Service
class DatabaseService(dataSource: DataSource) {
    val jdbc = JdbcTemplate(dataSource)
    val namedJdbc = NamedParameterJdbcTemplate(dataSource)

    /**
     * Convert a parameter before passing to JDBC:
     * - String values matching UUID format → java.util.UUID (avoids uuid = varchar type error)
     * - All others passed through unchanged
     */
    private fun coerce(p: Any?): Any? {
        if (p is String && p.length == 36 && p.count { it == '-' } == 4) {
            return try { java.util.UUID.fromString(p) } catch (_: Exception) { p }
        }
        return p
    }

    /**
     * Convert a JDBC result value to a JSON-friendly type:
     * - java.sql.Array (TEXT[], UUID[]) → List
     * - PgObject (jsonb/json) → String of the JSON value (via reflection to avoid compile-time dep)
     */
    private fun coerceValue(v: Any?): Any? = when {
        v is java.sql.Array -> (v.array as? Array<*>)?.toList() ?: emptyList<Any>()
        v != null && (v.javaClass.name == "org.postgresql.util.PGobject" ||
                      v.javaClass.name == "org.postgresql.util.PgObject") ->
            v.javaClass.getMethod("getValue").invoke(v) as? String
        else -> v
    }

    fun queryForList(sql: String, vararg params: Any?): List<Map<String, Any?>> {
        val args = params.filterNotNull().map { coerce(it) }.toTypedArray()
        val raw = if (args.isEmpty()) jdbc.queryForList(sql) else jdbc.queryForList(sql, *args)
        return raw.map { row -> row.mapValues { (_, v) -> coerceValue(v) } }
    }

    fun queryForMap(sql: String, vararg params: Any?): Map<String, Any?>? {
        return try {
            val args = params.filterNotNull().map { coerce(it) }.toTypedArray()
            val result = if (args.isEmpty()) jdbc.queryForList(sql) else jdbc.queryForList(sql, *args)
            result.firstOrNull()?.mapValues { (_, v) -> coerceValue(v) }
        } catch (e: Exception) {
            null
        }
    }

    fun update(sql: String, vararg params: Any?): Int {
        val args = params.filterNotNull().map { coerce(it) }.toTypedArray()
        return if (args.isEmpty()) jdbc.update(sql) else jdbc.update(sql, *args)
    }

    fun updateRaw(sql: String, vararg params: Any?): Int {
        // Allows null params — coerce non-nulls for UUID safety
        val args = params.map { coerce(it) }.toTypedArray()
        return jdbc.update(sql, *args)
    }

    /**
     * Like queryForList but preserves null params (for COALESCE(?, col) patterns).
     */
    fun queryForListRaw(sql: String, vararg params: Any?): List<Map<String, Any?>> {
        val args = params.map { coerce(it) }.toTypedArray()
        return jdbc.queryForList(sql, *args).map { row -> row.mapValues { (_, v) -> coerceValue(v) } }
    }

    /**
     * Like queryForList but passes params as-is without UUID coercion.
     * Use when a param must stay as TEXT/String (e.g. slug lookup on a TEXT column).
     */
    fun queryForListStr(sql: String, vararg params: Any?): List<Map<String, Any?>> {
        return if (params.isEmpty())
            jdbc.queryForList(sql).map { row -> row.mapValues { (_, v) -> coerceValue(v) } }
        else
            jdbc.queryForList(sql, *params).map { row -> row.mapValues { (_, v) -> coerceValue(v) } }
    }

    @Transactional
    fun <T> transaction(block: DatabaseService.() -> T): T = block(this)
}
