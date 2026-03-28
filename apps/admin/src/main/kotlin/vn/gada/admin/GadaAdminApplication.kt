package vn.gada.admin

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.boot.runApplication
import vn.gada.admin.config.AppProperties

@SpringBootApplication
@EnableConfigurationProperties(AppProperties::class)
class GadaAdminApplication

fun main(args: Array<String>) {
    runApplication<GadaAdminApplication>(*args)
}
