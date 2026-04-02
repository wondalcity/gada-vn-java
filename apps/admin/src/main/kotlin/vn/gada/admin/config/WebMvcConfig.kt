package vn.gada.admin.config

import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory
import org.springframework.boot.web.server.WebServerFactoryCustomizer
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class WebMvcConfig {

    @Bean
    fun mimeTypeCustomizer(): WebServerFactoryCustomizer<TomcatServletWebServerFactory> =
        WebServerFactoryCustomizer { factory ->
            factory.addContextCustomizers { context ->
                context.addMimeMapping("js",    "application/javascript")
                context.addMimeMapping("mjs",   "application/javascript")
                context.addMimeMapping("css",   "text/css")
                context.addMimeMapping("woff",  "font/woff")
                context.addMimeMapping("woff2", "font/woff2")
                context.addMimeMapping("svg",   "image/svg+xml")
                context.addMimeMapping("ico",   "image/x-icon")
            }
        }
}
