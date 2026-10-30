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
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(name = "tasks")
open class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Int? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    open lateinit var room: Room

    @Column(nullable = false, length = 255)
    open var title: String = ""

    @Column(length = 1000)
    open var description: String? = null

    @Column(name = "assigned_to", nullable = false, length = 255)
    open var assignedTo: String = ""

    @Column(nullable = false, length = 50)
    open var status: String = "Pending"

    @Column(nullable = false, length = 20)
    open var priority: String = "Medium"

    @Column(name = "due_date")
    open var dueDate: LocalDate? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: LocalDateTime = LocalDateTime.now()

    val completed: Boolean
        get() = status.equals("Completed", ignoreCase = true)
}
