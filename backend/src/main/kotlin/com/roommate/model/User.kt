package com.roommate.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.LocalDateTime

@Entity
@Table(name = "users")
open class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Int? = null

    @Column(nullable = false, length = 255)
    open var name: String = ""

    @Column(nullable = false, unique = true, length = 255)
    open var email: String = ""

    @Column(nullable = false, length = 255)
    open var password: String = ""

    @Column(name = "notifications_enabled", nullable = false)
    open var notificationsEnabled: Boolean = true

    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: LocalDateTime = LocalDateTime.now()
}
