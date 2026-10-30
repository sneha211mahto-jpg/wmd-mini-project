package com.roommate.controller

import com.roommate.dto.MessageResponse
import com.roommate.dto.ShoppingListResponse
import com.roommate.dto.ShoppingRequest
import com.roommate.dto.ShoppingResponse
import com.roommate.security.UserPrincipal
import com.roommate.security.requireUserId
import com.roommate.service.ShoppingService
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
@RequestMapping("/api/shopping")
class ShoppingController(private val shoppingService: ShoppingService) {
    @PostMapping("/{userId}")
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @PathVariable userId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: ShoppingRequest,
    ): ShoppingResponse =
        ShoppingResponse("Shopping item added successfully", shoppingService.create(principal.requireUserId(userId), request))

    @GetMapping
    fun listAll(@AuthenticationPrincipal principal: UserPrincipal): ShoppingListResponse =
        ShoppingListResponse(shoppingService.list(principal.user.id!!))

    @GetMapping("/{userId}")
    fun list(@PathVariable userId: Int, @AuthenticationPrincipal principal: UserPrincipal): ShoppingListResponse =
        ShoppingListResponse(shoppingService.list(principal.requireUserId(userId)))

    @PutMapping("/{userId}/{itemId}")
    fun update(
        @PathVariable userId: Int,
        @PathVariable itemId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: ShoppingRequest,
    ): MessageResponse {
        shoppingService.update(itemId, principal.requireUserId(userId), request)
        return MessageResponse("Shopping item updated successfully")
    }

    @DeleteMapping("/{userId}/{itemId}")
    fun delete(
        @PathVariable userId: Int,
        @PathVariable itemId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
    ): MessageResponse {
        shoppingService.delete(itemId, principal.requireUserId(userId))
        return MessageResponse("Shopping item deleted successfully")
    }
}
