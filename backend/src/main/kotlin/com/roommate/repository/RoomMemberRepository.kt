package com.roommate.repository

import com.roommate.model.RoomMember
import org.springframework.data.jpa.repository.JpaRepository

interface RoomMemberRepository : JpaRepository<RoomMember, Int> {
    fun findByUser_IdAndIsActiveTrue(userId: Int): List<RoomMember>
    fun findByRoom_IdAndIsActiveTrue(roomId: Int): List<RoomMember>
    fun findByRoom_IdAndIsActiveFalse(roomId: Int): List<RoomMember>
    fun findByRoom_IdAndUser_Id(roomId: Int, userId: Int): RoomMember?
    fun findByRoom_IdAndUser_EmailIgnoreCase(roomId: Int, email: String): RoomMember?
    fun existsByRoom_IdAndUser_IdAndIsActiveTrue(roomId: Int, userId: Int): Boolean
}
