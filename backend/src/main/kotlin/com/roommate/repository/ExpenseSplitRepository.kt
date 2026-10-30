package com.roommate.repository

import com.roommate.model.ExpenseSplit
import org.springframework.data.jpa.repository.JpaRepository

interface ExpenseSplitRepository : JpaRepository<ExpenseSplit, Int> {
    fun findByExpense_Id(expenseId: Int): List<ExpenseSplit>
    fun findByExpense_Room_Id(roomId: Int): List<ExpenseSplit>
    fun deleteByExpense_Id(expenseId: Int)
}
