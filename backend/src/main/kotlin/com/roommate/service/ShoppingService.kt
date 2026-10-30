package com.roommate.service

import com.roommate.dto.ShoppingItemDto
import com.roommate.dto.ShoppingRequest
import com.roommate.model.ShoppingItem
import com.roommate.repository.RoomMemberRepository
import com.roommate.repository.ShoppingItemRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@Service
class ShoppingService(
    private val shoppingItems: ShoppingItemRepository,
    private val roomMembers: RoomMemberRepository,
    private val roomService: RoomService,
) {
    @Transactional(readOnly = true)
    fun listAll(): List<ShoppingItemDto> = shoppingItems.findAll().sortedByDescending { it.createdAt }.map(::toDto)

    @Transactional(readOnly = true)
    fun list(userId: Int): List<ShoppingItemDto> = roomMembers.findByUser_IdAndIsActiveTrue(userId)
        .map { it.room.id!! }
        .distinct()
        .flatMap(shoppingItems::findByRoom_IdOrderByCreatedAtDesc)
        .sortedByDescending { it.createdAt }
        .map(::toDto)

    @Transactional
    fun create(userId: Int, request: ShoppingRequest): ShoppingItemDto {
        val roomId = request.roomId ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Room ID is required")
        val member = requireMember(userId, roomId)
        val item = shoppingItems.save(ShoppingItem().apply {
            room = member.room
            name = request.itemName.trim()
            quantity = request.quantity.trim()
            addedBy = member.user.name
            status = normalizeStatus(request.status)
        })
        return toDto(item)
    }

    @Transactional
    fun update(itemId: Int, userId: Int, request: ShoppingRequest): ShoppingItemDto {
        val item = findItem(itemId)
        val member = requireMember(userId, item.room.id!!)
        item.name = request.itemName.trim()
        item.quantity = request.quantity.trim()
        item.addedBy = member.user.name
        item.status = normalizeStatus(request.status)
        return toDto(item)
    }

    @Transactional
    fun delete(itemId: Int, userId: Int) {
        val item = findItem(itemId)
        requireMember(userId, item.room.id!!)
        shoppingItems.delete(item)
    }

    private fun requireMember(userId: Int, roomId: Int): com.roommate.model.RoomMember {
        val member = roomService.requireResident(roomId, userId)
        if (member.user.id == roomService.findRoom(roomId).createdBy.id) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "The room Owner cannot manage shopping items")
        }
        return member
    }

    private fun normalizeStatus(status: String): String =
        if (status.equals("Purchased", ignoreCase = true) || status.equals("true", ignoreCase = true)) "Purchased" else "Pending"

    private fun toDto(item: ShoppingItem) = ShoppingItemDto(
        id = item.id!!,
        roomId = item.room.id!!,
        itemName = item.name,
        quantity = item.quantity,
        addedBy = item.addedBy,
        status = item.status,
        purchased = item.purchased,
        createdAt = item.createdAt,
    )

    private fun findItem(id: Int): ShoppingItem = shoppingItems.findById(id).orElseThrow {
        ResponseStatusException(HttpStatus.NOT_FOUND, "Shopping item not found")
    }
}
