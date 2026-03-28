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

    fun queryForList(sql: String, vararg params: Any?): List<Map<String, Any?>> {
        val filtered = params.filterNotNull().toTypedArray()
        return if (filtered.isEmpty()) {
            jdbc.queryForList(sql).map { it as Map<String, Any?> }
        } else {
            jdbc.queryForList(sql, *filtered).map { it as Map<String, Any?> }
        }
    }

    fun queryForMap(sql: String, vararg params: Any?): Map<String, Any?>? {
        return try {
            val filtered = params.filterNotNull().toTypedArray()
            val result = if (filtered.isEmpty()) {
                jdbc.queryForList(sql)
            } else {
                jdbc.queryForList(sql, *filtered)
            }
            result.firstOrNull()?.let { it as Map<String, Any?> }
        } catch (e: Exception) {
            null
        }
    }

    fun update(sql: String, vararg params: Any?): Int {
        val filtered = params.filterNotNull().toTypedArray()
        return if (filtered.isEmpty()) {
            jdbc.update(sql)
        } else {
            jdbc.update(sql, *filtered)
        }
    }

    fun updateRaw(sql: String, vararg params: Any?): Int {
        // Allows null params — use PreparedStatement
        return jdbc.update(sql, *params)
    }

    /**
     * Like queryForList but preserves null params (for COALESCE(?, col) patterns).
     * Uses PreparedStatementCreator to pass nulls correctly.
     */
    fun queryForListRaw(sql: String, vararg params: Any?): List<Map<String, Any?>> {
        return jdbc.queryForList(sql, *params).map { it as Map<String, Any?> }
    }

    @Transactional
    fun <T> transaction(block: DatabaseService.() -> T): T = block(this)
}
