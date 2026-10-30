package com.roommate.service

import com.roommate.dto.AuthResponse
import com.roommate.dto.LoginRequest
import com.roommate.dto.SignupRequest
import com.roommate.dto.UserSummary
import com.roommate.model.User
import com.roommate.repository.RoomMemberRepository
import com.roommate.repository.UserRepository
import com.roommate.security.JwtService
import com.roommate.security.UserPrincipal
import org.springframework.http.HttpStatus
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime

@Service
class AuthService(
    private val userRepository: UserRepository,
    private val roomMemberRepository: RoomMemberRepository,
    private val passwordEncoder: PasswordEncoder,
    private val authenticationManager: AuthenticationManager,
    private val jwtService: JwtService,
) {
    @Transactional
    fun signup(request: SignupRequest): User {
        val name = request.name.trim()
        val email = request.email.trim().lowercase()
        val password = request.password

        if (name.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required")
        }
        if (email.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required")
        }
        if (password.length < 6) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 6 characters long")
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already exists")
        }

        val user = User().apply {
            this.name = name
            this.email = email
            this.password = passwordEncoder.encode(password)
            this.notificationsEnabled = true
            this.createdAt = LocalDateTime.now()
        }

        return userRepository.save(user)
    }

    @Transactional
    fun login(request: LoginRequest): AuthResponse {
        val email = request.email.trim().lowercase()
        val loginType = request.loginType.uppercase()
        val authentication = authenticationManager.authenticate(
            UsernamePasswordAuthenticationToken(email, request.password)
        )

        val principal = authentication.principal as UserPrincipal
        val user = principal.user
        val membership = roomMemberRepository.findByUser_IdAndIsActiveTrue(user.id!!).singleOrNull()
            ?: throw ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "No active room found. Create a room or join one before logging in as $loginType.",
            )
        val expectedRole = if (loginType == "OWNER") "OWNER" else "MEMBER"
        val actualRole = membership.role

        if (actualRole != expectedRole) {
            val message = if (actualRole == "OWNER") {
                "Owner accounts cannot log in through Member Login."
            } else {
                "Member accounts cannot log in through Owner Login."
            }
            throw ResponseStatusException(HttpStatus.FORBIDDEN, message)
        }

        val token = jwtService.generateToken(user)
        return AuthResponse(
            token = token,
            user = UserSummary(
                id = user.id!!,
                name = user.name,
                email = user.email,
            ),
        )
    }
}
