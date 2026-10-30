package com.roommate.controller

import com.roommate.dto.ChangePasswordRequest
import com.roommate.dto.MessageResponse
import com.roommate.dto.UserSummary
import com.roommate.repository.UserRepository
import com.roommate.security.UserPrincipal
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

@RestController
@RequestMapping("/api")
class ProfileController(
    private val userRepository: UserRepository,
    private val passwordEncoder: PasswordEncoder,
) {
    @GetMapping("/profile")
    fun getProfile(): UserSummary {
        val email = SecurityContextHolder.getContext().authentication.name
        val user = userRepository.findByEmailIgnoreCase(email)
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found")

        return UserSummary(
            id = user.id!!,
            name = user.name,
            email = user.email,
        )
    }

    @PutMapping("/profile/password")
    fun changePassword(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: ChangePasswordRequest,
    ): MessageResponse {
        val user = principal.user
        if (!passwordEncoder.matches(request.currentPassword, user.password)) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect")
        }
        if (request.newPassword.length < 6) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be at least 6 characters long")
        }
        if (request.newPassword == request.currentPassword) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "New password must be different from the current password")
        }

        user.password = passwordEncoder.encode(request.newPassword)
        userRepository.save(user)
        return MessageResponse("Password changed successfully")
    }
}
