package com.roommate.security

import com.roommate.model.User
import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import java.nio.charset.StandardCharsets
import java.util.Date

@Service
class JwtService(
    @Value("${'$'}{app.jwt.secret}") secret: String,
    @Value("${'$'}{app.jwt.expiration-ms}") private val expirationMs: Long,
) {
    private val signingKey = Keys.hmacShaKeyFor(secret.toByteArray(StandardCharsets.UTF_8))

    fun generateToken(user: User): String {
        val now = Date()
        val expiry = Date(now.time + expirationMs)

        return Jwts.builder()
            .subject(user.email)
            .claim("userId", user.id)
            .claim("name", user.name)
            .issuedAt(now)
            .expiration(expiry)
            .signWith(signingKey, Jwts.SIG.HS256)
            .compact()
    }

    fun extractEmail(token: String): String =
        parseToken(token).subject

    fun extractUserId(token: String): Int? =
        parseToken(token).get("userId", Integer::class.java)?.toInt()

    fun validateToken(token: String): Boolean =
        try {
            parseToken(token)
            true
        } catch (_: Exception) {
            false
        }

    private fun parseToken(token: String) =
        Jwts.parser()
            .verifyWith(signingKey)
            .build()
            .parseSignedClaims(token)
            .payload
}
