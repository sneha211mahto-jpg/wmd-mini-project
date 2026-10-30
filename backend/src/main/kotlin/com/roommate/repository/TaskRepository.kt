package com.roommate.repository

import com.roommate.model.Task
import org.springframework.data.jpa.repository.JpaRepository

interface TaskRepository : JpaRepository<Task, Int> {
    fun findByRoom_IdOrderByCreatedAtDesc(roomId: Int): List<Task>
}
