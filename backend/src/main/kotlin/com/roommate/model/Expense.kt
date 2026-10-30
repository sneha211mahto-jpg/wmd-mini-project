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
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

@Entity
@Table(name = "expenses")
open class Expense {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    open var id: Int? = null

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    open lateinit var room: Room

    @Column(nullable = false, length = 255)
    open var title: String = ""

    @Column(nullable = false, precision = 10, scale = 2)
    open var amount: BigDecimal = BigDecimal.ZERO

    @Column(nullable = false, length = 100)
    open var category: String = "Other"

    @Column(name = "paid_by", nullable = false, length = 255)
    open var paidBy: String = ""

    @Column(name = "split_type", length = 100)
    open var splitType: String = "equal"

    @Column(name = "expense_date")
    open var expenseDate: LocalDate? = null

    @Column(length = 1000)
    open var description: String? = null

    @Column(name = "created_at", nullable = false, updatable = false)
    open var createdAt: LocalDateTime = LocalDateTime.now()
}
