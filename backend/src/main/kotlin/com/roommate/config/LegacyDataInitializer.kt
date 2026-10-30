package com.roommate.config

import org.springframework.boot.CommandLineRunner
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Component

@Component
class LegacyDataInitializer(private val jdbcTemplate: JdbcTemplate) : CommandLineRunner {
    override fun run(vararg args: String?) {
        jdbcTemplate.update(
            """
            UPDATE room_members rm
            INNER JOIN rooms r ON r.id = rm.room_id
            SET rm.role = CASE WHEN rm.user_id = r.created_by THEN 'OWNER' ELSE 'MEMBER' END
            """.trimIndent(),
        )
    }
}
