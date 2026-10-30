package com.roommate.model

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.LocalDateTime

@Entity
@Table(
    name = "room_members",
    uniqueConstraints = [UniqueConstraint(name = "uk_room_member", columnNames = ["room_id", "user_id"])],
)
open class RoomMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Int? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    open lateinit var room: Room

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    open lateinit var user: User

    @Column(nullable = false, length = 20)
    open var role: String = "MEMBER"

    @Column(name = "is_active", nullable = false)
    open var isActive: Boolean = true

    @Column(name = "removed_at")
    open var removedAt: LocalDateTime? = null
}
