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
import java.time.LocalDateTime

@Entity
@Table(name = "shopping_items")
open class ShoppingItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Int? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    open lateinit var room: Room

    @Column(name = "item_name", nullable = false, length = 255)
    open var name: String = ""

    @Column(nullable = false, length = 100)
    open var quantity: String = ""

    @Column(name = "added_by", nullable = false, length = 255)
    open var addedBy: String = ""

    @Column(nullable = false, length = 50)
    open var status: String = "Pending"

    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: LocalDateTime = LocalDateTime.now()

    val purchased: Boolean
        get() = status.equals("Purchased", ignoreCase = true)
}
