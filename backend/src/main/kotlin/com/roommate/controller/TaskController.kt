package com.roommate.controller

import com.roommate.dto.TaskRequest
import com.roommate.dto.TaskResponse
import com.roommate.dto.TasksResponse
import com.roommate.dto.MessageResponse
import com.roommate.security.UserPrincipal
import com.roommate.security.requireUserId
import com.roommate.service.TaskService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/tasks")
class TaskController(private val taskService: TaskService) {
    @PostMapping("/{userId}")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable userId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: TaskRequest,
    ): TaskResponse = TaskResponse("Task created successfully", taskService.create(principal.requireUserId(userId), request))

    @GetMapping
    fun listAll(@AuthenticationPrincipal principal: UserPrincipal): TasksResponse =
        TasksResponse(taskService.list(principal.user.id!!))

    @GetMapping("/{userId}")
    fun list(@PathVariable userId: Int, @AuthenticationPrincipal principal: UserPrincipal): TasksResponse =
        TasksResponse(taskService.list(principal.requireUserId(userId)))

    @GetMapping("/{userId}/{taskId}")
    fun get(
        @PathVariable userId: Int,
        @PathVariable taskId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
    ) = taskService.get(taskId, principal.requireUserId(userId))

    @PutMapping("/{userId}/{taskId}")
    fun update(
        @PathVariable userId: Int,
        @PathVariable taskId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: TaskRequest,
    ): MessageResponse {
        taskService.update(taskId, principal.requireUserId(userId), request)
        return MessageResponse("Task updated successfully")
    }

    @DeleteMapping("/{userId}/{taskId}")
    fun delete(
        @PathVariable userId: Int,
        @PathVariable taskId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
    ): MessageResponse {
        taskService.delete(taskId, principal.requireUserId(userId))
        return MessageResponse("Task deleted successfully")
    }
}
