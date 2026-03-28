package vn.gada.admin.config

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "gada.admin")
data class AppProperties(
    val username: String = "admin",
    val passwordHash: String = "",
    val apiBaseUrl: String = "http://localhost:7001/v1",
    val apiAdminKey: String = ""
)
