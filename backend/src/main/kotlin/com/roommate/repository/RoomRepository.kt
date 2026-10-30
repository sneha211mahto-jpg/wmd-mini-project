package com.roommate.repository

import com.roommate.model.Room
import org.springframework.data.jpa.repository.JpaRepository

interface RoomRepository : JpaRepository<Room, Int> {
    fun findByCreatedBy_Id(userId: Int): List<Room>
}
