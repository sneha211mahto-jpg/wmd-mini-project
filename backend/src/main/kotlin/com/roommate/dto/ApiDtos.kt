package com.roommate.dto

import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern
import jakarta.validation.constraints.Positive
import jakarta.validation.constraints.PositiveOrZero
import jakarta.validation.constraints.Size
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime

data class UserDto(
    val id: Int,
    val name: String,
    val email: String,
    val createdAt: LocalDateTime? = null,
)

data class MessageResponse(val message: String)

data class SignupRequest(
    @field:NotBlank val name: String,
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank val password: String,
)

data class LoginRequest(
    @field:Email @field:NotBlank val email: String,
    @field:NotBlank val password: String,
    @field:Pattern(regexp = "^(OWNER|MEMBER)$")
    @field:JsonProperty("loginType") val loginType: String,
)

data class UserSummary(
    val id: Int,
    val name: String,
    val email: String,
)

data class AuthResponse(
    val token: String,
    val user: UserSummary,
)

data class UpdateUserRequest(
    @field:NotBlank val name: String,
    @field:Email @field:NotBlank val email: String,
)

data class ChangePasswordRequest(
    @field:NotBlank val currentPassword: String,
    @field:NotBlank @field:Size(min = 6) val newPassword: String,
)

data class CreateRoomRequest(
    @field:NotBlank val roomName: String,
    @field:PositiveOrZero val monthlyRent: BigDecimal,
    val createdBy: Int? = null,
    val roomNumber: String? = null,
)

data class JoinRoomRequest(val roomId: Int)
data class AddMemberRequest(@field:Email @field:NotBlank val email: String)

data class MemberDto(
    val id: Int,
    val name: String,
    val email: String,
    val role: String,
    val active: Boolean = true,
    val removedAt: LocalDateTime? = null,
)

data class RoomDto(
    val id: Int,
    val roomName: String,
    val roomNumber: String?,
    val monthlyRent: BigDecimal,
    val createdBy: Int,
    val createdByName: String,
    val members: List<MemberDto>,
)

data class RoomsResponse(val rooms: List<RoomDto>)
data class RoomResponse(val message: String, val room: RoomDto)
data class MembersResponse(val members: List<MemberDto>)

data class ExpenseRequest(
    val roomId: Int? = null,
    @field:NotBlank val title: String,
    @field:Positive val amount: BigDecimal,
    @field:NotBlank val category: String,
    @field:NotBlank val paidBy: String,
    val splitType: String = "equal",
    val date: LocalDate? = null,
    val description: String? = null,
)

data class ExpenseShareDto(val name: String, val amount: BigDecimal)
data class ExpenseDto(
    val id: Int,
    val roomId: Int,
    val title: String,
    val amount: BigDecimal,
    val category: String,
    val paidBy: String,
    val splitType: String,
    val expenseDate: LocalDate?,
    val description: String?,
    val createdAt: LocalDateTime,
    val splitBetween: List<ExpenseShareDto>,
)
data class ExpensesResponse(val expenses: List<ExpenseDto>)
data class ExpenseResponse(val message: String, val expense: ExpenseDto)

data class TaskRequest(
    val roomId: Int? = null,
    @field:NotBlank val title: String,
    @field:NotBlank val assignedTo: String,
    val dueDate: LocalDate? = null,
    val status: String = "Pending",
    val priority: String = "Medium",
    val description: String? = null,
)
data class TaskDto(
    val id: Int,
    val roomId: Int,
    val title: String,
    val description: String?,
    val assignedTo: String,
    val status: String,
    val priority: String,
    val dueDate: LocalDate?,
    val completed: Boolean,
    val createdAt: LocalDateTime,
)
data class TasksResponse(val tasks: List<TaskDto>)
data class TaskResponse(val message: String, val task: TaskDto)

data class ShoppingRequest(
    val roomId: Int? = null,
    @field:NotBlank val itemName: String,
    @field:NotBlank val quantity: String,
    val addedBy: String? = null,
    val status: String = "Pending",
)
data class ShoppingItemDto(
    val id: Int,
    val roomId: Int,
    val itemName: String,
    val quantity: String,
    val addedBy: String,
    val status: String,
    val purchased: Boolean,
    val createdAt: LocalDateTime,
)
data class ShoppingResponse(val message: String, val item: ShoppingItemDto)
data class ShoppingListResponse(val shoppingItems: List<ShoppingItemDto>)
