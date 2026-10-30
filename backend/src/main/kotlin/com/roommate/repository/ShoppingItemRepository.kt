package com.roommate.repository

import com.roommate.model.ShoppingItem
import org.springframework.data.jpa.repository.JpaRepository

interface ShoppingItemRepository : JpaRepository<ShoppingItem, Int> {
    fun findByRoom_IdOrderByCreatedAtDesc(roomId: Int): List<ShoppingItem>
}
