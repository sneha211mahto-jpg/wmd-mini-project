package com.roommate.controller

import com.roommate.dto.ExpenseRequest
import com.roommate.dto.ExpenseResponse
import com.roommate.dto.ExpensesResponse
import com.roommate.dto.MessageResponse
import com.roommate.security.UserPrincipal
import com.roommate.service.ExpenseService
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
@RequestMapping("/api/expenses")
class ExpenseController(private val expenseService: ExpenseService) {
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: ExpenseRequest,
    ): ExpenseResponse {
        val expense = expenseService.create(principal.user.id!!, request)
        return ExpenseResponse("Expense added successfully", expense)
    }

    @GetMapping
    fun list(@AuthenticationPrincipal principal: UserPrincipal): ExpensesResponse =
        ExpensesResponse(expenseService.list(principal.user.id!!))

    @GetMapping("/{expenseId}")
    fun get(@PathVariable expenseId: Int, @AuthenticationPrincipal principal: UserPrincipal) =
        expenseService.get(expenseId, principal.user.id!!)

    @PutMapping("/{expenseId}")
    fun update(
        @PathVariable expenseId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: ExpenseRequest,
    ): MessageResponse {
        expenseService.update(expenseId, principal.user.id!!, request)
        return MessageResponse("Expense updated successfully")
    }

    @DeleteMapping("/{expenseId}")
    fun delete(@PathVariable expenseId: Int, @AuthenticationPrincipal principal: UserPrincipal): MessageResponse {
        expenseService.delete(expenseId, principal.user.id!!)
        return MessageResponse("Expense deleted successfully")
    }
}
