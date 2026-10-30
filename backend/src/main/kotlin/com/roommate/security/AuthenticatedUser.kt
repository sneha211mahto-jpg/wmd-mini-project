package com.roommate.security

import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

fun UserPrincipal.requireUserId(requestedUserId: Int): Int {
    val authenticatedUserId = user.id
        ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "User identity is unavailable")
    if (requestedUserId != authenticatedUserId) {
        throw ResponseStatusException(HttpStatus.FORBIDDEN, "You cannot access another user's data")
    }
    return authenticatedUserId
}