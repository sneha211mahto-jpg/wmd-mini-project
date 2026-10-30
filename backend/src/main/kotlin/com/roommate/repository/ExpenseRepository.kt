package com.roommate.repository

import com.roommate.model.Expense
import org.springframework.data.jpa.repository.JpaRepository

interface ExpenseRepository : JpaRepository<Expense, Int> {
    fun findByRoom_IdOrderByCreatedAtDesc(roomId: Int): List<Expense>
    fun findByIdAndRoom_Id(id: Int, roomId: Int): Expense?
}
