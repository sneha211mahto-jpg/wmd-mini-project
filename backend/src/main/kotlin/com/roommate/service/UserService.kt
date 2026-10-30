package com.roommate.service

import com.roommate.dto.UpdateUserRequest
import com.roommate.dto.UserDto
import com.roommate.model.User
import com.roommate.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@Service
class UserService(private val users: UserRepository) {
    @Transactional(readOnly = true)
    fun get(userId: Int): UserDto = toDto(findUser(userId))

    @Transactional
    fun update(userId: Int, request: UpdateUserRequest): UserDto {
        val user = findUser(userId)
        val email = request.email.trim().lowercase()
        val duplicate = users.findByEmailIgnoreCase(email)
        if (duplicate != null && duplicate.id != userId) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "That email address is already registered")
        }
        user.name = request.name.trim()
        user.email = email
        return toDto(user)
    }

    private fun findUser(userId: Int): User = users.findById(userId).orElseThrow {
        ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
    }

    private fun toDto(user: User) = UserDto(
        id = user.id!!,
        name = user.name,
        email = user.email,
        createdAt = user.createdAt,
    )
}
