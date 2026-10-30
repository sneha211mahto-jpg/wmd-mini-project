package com.roommate.service

import com.roommate.dto.TaskDto
import com.roommate.dto.TaskRequest
import com.roommate.model.Task
import com.roommate.repository.RoomMemberRepository
import com.roommate.repository.TaskRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDate

@Service
class TaskService(
    private val tasks: TaskRepository,
    private val roomMembers: RoomMemberRepository,
    private val roomService: RoomService,
) {
    @Transactional(readOnly = true)
    fun listAll(): List<TaskDto> = tasks.findAll().sortedByDescending { it.createdAt }.map(::toDto)

    @Transactional(readOnly = true)
    fun list(userId: Int): List<TaskDto> = roomMembers.findByUser_IdAndIsActiveTrue(userId)
        .map { it.room.id!! }
        .distinct()
        .flatMap(tasks::findByRoom_IdOrderByCreatedAtDesc)
        .sortedByDescending { it.createdAt }
        .map(::toDto)

    @Transactional(readOnly = true)
    fun get(taskId: Int, userId: Int): TaskDto {
        val task = findTask(taskId)
        roomService.requireActiveMembership(task.room.id!!, userId)
        return toDto(task)
    }

    @Transactional
    fun create(userId: Int, request: TaskRequest): TaskDto {
        val roomId = request.roomId ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Room ID is required")
        requireMember(userId, roomId)
        val room = roomService.findRoom(roomId)
        validateAssignee(roomId, request.assignedTo)
        val task = tasks.save(Task().apply {
            this.room = room
            title = request.title.trim()
            description = request.description?.trim()?.takeIf(String::isNotEmpty)
            assignedTo = request.assignedTo.trim()
            status = normalizeStatus(request.status)
            priority = normalizePriority(request.priority)
            dueDate = request.dueDate ?: LocalDate.now()
        })
        return toDto(task)
    }

    @Transactional
    fun update(taskId: Int, userId: Int, request: TaskRequest): TaskDto {
        val task = findTask(taskId)
        val roomId = task.room.id!!
        requireMember(userId, roomId)
        validateAssignee(roomId, request.assignedTo)
        val requestedStatus = normalizeStatus(request.status)
        if (requestedStatus == "Completed" && !isAssignedToUser(userId, roomId, request.assignedTo)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the assigned Member can complete this task.")
        }
        task.title = request.title.trim()
        task.description = request.description?.trim()?.takeIf(String::isNotEmpty)
        task.assignedTo = request.assignedTo.trim()
        task.status = requestedStatus
        task.priority = normalizePriority(request.priority)
        task.dueDate = request.dueDate ?: task.dueDate
        return toDto(task)
    }

    @Transactional
    fun delete(taskId: Int, userId: Int) {
        val task = findTask(taskId)
        requireMember(userId, task.room.id!!)
        tasks.delete(task)
    }

    private fun requireMember(userId: Int, roomId: Int) {
        val membership = roomService.requireResident(roomId, userId)
        if (membership.user.id == roomService.findRoom(roomId).createdBy.id) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "The room Owner cannot manage tasks")
        }
    }

    private fun validateAssignee(roomId: Int, assignedTo: String) {
        val activeMembers = roomService.activeResidents(roomId)
            .filter { it.user.id != roomService.findRoom(roomId).createdBy.id }
        val activeNames = activeMembers.map { it.user.name }
        if (activeNames.none { it.equals(assignedTo.trim(), ignoreCase = true) }) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an active Member of this room for the task")
        }
    }

    private fun isAssignedToUser(userId: Int, roomId: Int, assignedTo: String): Boolean =
        roomService.activeResidents(roomId)
            .any { it.user.id == userId && it.user.name.equals(assignedTo.trim(), ignoreCase = true) }

    private fun normalizeStatus(status: String): String = when (status.trim().lowercase()) {
        "completed", "complete", "done" -> "Completed"
        else -> "Pending"
    }

    private fun normalizePriority(priority: String): String = when (priority.trim().lowercase()) {
        "low" -> "Low"
        "high" -> "High"
        else -> "Medium"
    }

    private fun toDto(task: Task) = TaskDto(
        id = task.id!!,
        roomId = task.room.id!!,
        title = task.title,
        description = task.description,
        assignedTo = task.assignedTo,
        status = task.status,
        priority = task.priority,
        dueDate = task.dueDate,
        completed = task.completed,
        createdAt = task.createdAt,
    )

    private fun findTask(id: Int): Task = tasks.findById(id).orElseThrow {
        ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found")
    }
}
