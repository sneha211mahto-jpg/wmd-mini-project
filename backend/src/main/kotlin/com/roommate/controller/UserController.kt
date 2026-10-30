package com.roommate.controller

import com.roommate.dto.UpdateUserRequest
import com.roommate.security.UserPrincipal
import com.roommate.security.requireUserId
import com.roommate.service.UserService
import jakarta.validation.Valid
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/users")
class UserController(private val userService: UserService) {
    @GetMapping("/{userId}")
    fun get(@PathVariable userId: Int, @AuthenticationPrincipal principal: UserPrincipal) =
        userService.get(principal.requireUserId(userId))

    @PutMapping("/{userId}")
    fun update(
        @PathVariable userId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: UpdateUserRequest,
    ) = userService.update(principal.requireUserId(userId), request)
}
