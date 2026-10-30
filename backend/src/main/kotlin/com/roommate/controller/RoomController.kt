package com.roommate.controller

import com.roommate.dto.AddMemberRequest
import com.roommate.dto.CreateRoomRequest
import com.roommate.security.UserPrincipal
import com.roommate.service.RoomService
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/rooms")
class RoomController(
    private val roomService: RoomService
) {

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun create(
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: CreateRoomRequest
    ) = roomService.createRoom(
        principal.user.id!!,
        request
    )

    @GetMapping
    fun list(
        @AuthenticationPrincipal principal: UserPrincipal
    ) = roomService.listRooms(
        principal.user.id!!
    )

    @GetMapping("/{roomId}")
    fun get(
        @PathVariable roomId: Int,
        @AuthenticationPrincipal principal: UserPrincipal
    ) = roomService.getRoom(
        roomId,
        principal.user.id!!
    )

    @PutMapping("/{roomId}")
    fun update(
        @PathVariable roomId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: CreateRoomRequest
    ) = mapOf(
        "message" to "Room updated successfully",
        "room" to roomService.updateRoom(
            roomId,
            principal.user.id!!,
            request
        )
    )

    @DeleteMapping("/{roomId}")
    fun delete(
        @PathVariable roomId: Int,
        @AuthenticationPrincipal principal: UserPrincipal
    ) = roomService.deleteRoom(
        roomId,
        principal.user.id!!
    )

    // =========================
    // ADD ROOM MEMBER
    // =========================

    @PostMapping("/{roomId}/members")
    fun addMember(
        @PathVariable roomId: Int,
        @AuthenticationPrincipal principal: UserPrincipal,
        @Valid @RequestBody request: AddMemberRequest
    ) = roomService.addMember(
        roomId,
        principal.user.id!!,
        request
    )

    // =========================
    // REMOVE ROOM MEMBER
    // =========================

    @DeleteMapping("/{roomId}/members/{userId}")
    fun removeMember(
        @PathVariable roomId: Int,
        @PathVariable userId: Int,
        @AuthenticationPrincipal principal: UserPrincipal
    ) = roomService.removeMember(
        roomId,
        principal.user.id!!,
        userId
    )

    // =========================
    // REMOVED MEMBERS
    // =========================

    @GetMapping("/{roomId}/members/removed")
    fun removedMembers(
        @PathVariable roomId: Int,
        @AuthenticationPrincipal principal: UserPrincipal
    ) = roomService.removedMembers(
        roomId,
        principal.user.id!!
    )
}