package com.roommate.exception

import com.roommate.dto.MessageResponse
import jakarta.validation.ConstraintViolationException
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.security.authentication.BadCredentialsException
import org.springframework.validation.FieldError
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.server.ResponseStatusException

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun invalidBody(exception: MethodArgumentNotValidException): ResponseEntity<MessageResponse> {
        val firstError = exception.bindingResult.allErrors.firstOrNull()
        val message = (firstError as? FieldError)?.defaultMessage ?: "Please check the request fields"
        return ResponseEntity.badRequest().body(MessageResponse(message))
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun invalidConstraint(exception: ConstraintViolationException): ResponseEntity<MessageResponse> {
        val message = exception.constraintViolations.firstOrNull()?.message
            ?: "Please check the request fields"
        return ResponseEntity.badRequest().body(MessageResponse(message))
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun invalidRequest(exception: HttpMessageNotReadableException): ResponseEntity<MessageResponse> {
        val message = exception.mostSpecificCause.message?.takeIf(String::isNotBlank)
            ?: "Invalid request data"
        return ResponseEntity.badRequest().body(MessageResponse(message))
    }

    @ExceptionHandler(DataIntegrityViolationException::class)
    fun conflict(): ResponseEntity<MessageResponse> =
        ResponseEntity.status(HttpStatus.CONFLICT).body(MessageResponse("The requested record conflicts with existing data"))

    @ExceptionHandler(BadCredentialsException::class)
    fun badCredentials(): ResponseEntity<MessageResponse> =
        ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(MessageResponse("Invalid email or password"))

    @ExceptionHandler(ResponseStatusException::class)
    fun statusException(exception: ResponseStatusException): ResponseEntity<MessageResponse> =
        ResponseEntity.status(exception.statusCode)
            .body(MessageResponse(exception.reason ?: "Request could not be completed"))

    @ExceptionHandler(Exception::class)
    fun unexpected(): ResponseEntity<MessageResponse> =
        ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(MessageResponse("The server could not complete the request"))
}
