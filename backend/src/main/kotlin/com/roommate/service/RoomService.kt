package com.roommate.service

import com.roommate.dto.AddMemberRequest
import com.roommate.dto.CreateRoomRequest
import com.roommate.dto.MemberDto
import com.roommate.dto.MessageResponse
import com.roommate.dto.RoomDto
import com.roommate.dto.RoomResponse
import com.roommate.dto.RoomsResponse
import com.roommate.model.Room
import com.roommate.model.RoomMember
import com.roommate.repository.RoomMemberRepository
import com.roommate.repository.RoomRepository
import com.roommate.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime

@Service
class RoomService(
    private val rooms: RoomRepository,
    private val roomMembers: RoomMemberRepository,
    private val users: UserRepository,
) {
    @Transactional(readOnly = true)
    fun listRooms(): RoomsResponse = RoomsResponse(rooms.findAll().map(::toRoomDto))

    @Transactional(readOnly = true)
    fun listRooms(userId: Int): RoomsResponse {
        val accessibleRooms = roomMembers.findByUser_IdAndIsActiveTrue(userId).map { it.room }.distinctBy { it.id }
        return RoomsResponse(accessibleRooms.map(::toRoomDto))
    }

    @Transactional
    fun createRoom(request: CreateRoomRequest): RoomResponse {
        val ownerId = request.createdBy
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "created_by is required")
        val owner = findUser(ownerId)
        val room = rooms.saveAndFlush(Room().apply {
            roomName = request.roomName.trim()
            roomNumber = request.roomNumber?.trim()?.takeIf(String::isNotEmpty)
            monthlyRent = request.monthlyRent
            createdBy = owner
        })
        val membership = roomMembers.findByRoom_IdAndUser_Id(room.id!!, ownerId)
        if (membership == null) {
            roomMembers.save(RoomMember().apply {
                this.room = room
                user = owner
                role = "OWNER"
            })
        }
        return RoomResponse("Room created successfully", toRoomDto(room))
    }

    @Transactional(readOnly = true)
    fun getRoom(roomId: Int): RoomDto = toRoomDto(findRoom(roomId))

    @Transactional
    fun updateRoom(roomId: Int, request: CreateRoomRequest): RoomDto {
        val room = findRoom(roomId)
        room.roomName = request.roomName.trim()
        room.roomNumber = request.roomNumber?.trim()?.takeIf(String::isNotEmpty)
        room.monthlyRent = request.monthlyRent
        return toRoomDto(room)
    }

    @Transactional
    fun deleteRoom(roomId: Int): MessageResponse {
        rooms.delete(findRoom(roomId))
        return MessageResponse("Room deleted successfully")
    }

    @Transactional(readOnly = true)
    fun getRoom(roomId: Int, userId: Int): RoomDto {
        requireActiveMembership(roomId, userId)
        return toRoomDto(findRoom(roomId))
    }

    @Transactional
    fun createRoom(userId: Int, request: CreateRoomRequest): RoomResponse {
        if (roomMembers.findByUser_IdAndIsActiveTrue(userId).isNotEmpty()) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "You are already part of an active room")
        }
        val owner = findUser(userId)
        val room = rooms.saveAndFlush(Room().apply {
            roomName = request.roomName.trim()
            roomNumber = request.roomNumber?.trim()?.takeIf(String::isNotEmpty)
            monthlyRent = request.monthlyRent
            createdBy = owner
        })
        roomMembers.save(RoomMember().apply {
            this.room = room
            user = owner
            role = "OWNER"
        })
        return RoomResponse("Room created successfully", toRoomDto(room))
    }

    @Transactional
    fun joinRoom(userId: Int, roomId: Int): MessageResponse {
        val room = findRoom(roomId)
        if (room.createdBy.id == userId) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "The room Owner is not a resident Member")
        }
        val existingActive = roomMembers.findByUser_IdAndIsActiveTrue(userId)
        if (existingActive.isNotEmpty()) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "You are already part of an active room")
        }
        val user = findUser(userId)
        val existing = roomMembers.findByRoom_IdAndUser_Id(roomId, userId)
        if (existing != null) {
            if (existing.isActive) throw ResponseStatusException(HttpStatus.CONFLICT, "You are already a Member of this room")
            existing.isActive = true
            existing.removedAt = null
            existing.role = "MEMBER"
            return MessageResponse("Rejoined the room successfully")
        }
        roomMembers.save(RoomMember().apply {
            this.room = room
            this.user = user
            role = "MEMBER"
        })
        return MessageResponse("Joined room successfully")
    }

    @Transactional
    fun addMember(roomId: Int, ownerId: Int, request: AddMemberRequest): Map<String, Any> {
        val room = requireOwner(roomId, ownerId)
        val user = users.findByEmailIgnoreCase(request.email.trim())
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email. Ask the person to sign up first.")
        if (user.id == ownerId) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "The room Owner is not a resident Member")
        }
        val activeMembership = roomMembers.findByUser_IdAndIsActiveTrue(user.id!!).firstOrNull()
        if (activeMembership != null) {
            val message = if (activeMembership.room.id == roomId) "This user is already a Member of this room" else "This user is already a Member of another room"
            throw ResponseStatusException(HttpStatus.CONFLICT, message)
        }

        val existing = roomMembers.findByRoom_IdAndUser_Id(roomId, user.id!!)
        val restored = existing != null
        if (existing != null) {
            existing.isActive = true
            existing.removedAt = null
            existing.role = "MEMBER"
        } else {
            roomMembers.save(RoomMember().apply {
                this.room = room
                this.user = user
                role = "MEMBER"
            })
        }
        val members = activeResidents(room)
            .filter { it.user.id != room.createdBy.id }
            .map(::memberDto)
        return mapOf(
            "message" to if (restored) "${user.name} was restored to the room" else "${user.name} was added to the room",
            "restored" to restored,
            "member" to mapOf("id" to user.id!!, "name" to user.name, "email" to user.email),
            "members" to members,
        )
    }

    @Transactional
    fun removeMember(roomId: Int, ownerId: Int, userId: Int): MessageResponse {
        val room = findRoom(roomId)
        val isOwner = ownerId == room.createdBy.id
        if (!isOwner && ownerId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Members can only remove themselves from the room.")
        }
        if (!isOwner) {
            return leaveRoom(roomId, userId)
        }
        if (userId == room.createdBy.id) {
            return leaveRoom(roomId, userId)
        }
        requireActiveMembership(roomId, ownerId)
        val membership = roomMembers.findByRoom_IdAndUser_Id(roomId, userId)
        if (membership == null || !membership.isActive) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "This Member is not active in the room")
        }
        membership.isActive = false
        membership.removedAt = LocalDateTime.now()
        return MessageResponse("${membership.user.name} was removed from the room")
    }

    @Transactional(readOnly = true)
    fun removedMembers(roomId: Int, ownerId: Int): List<MemberDto> {
        requireOwner(roomId, ownerId)
        return roomMembers.findByRoom_IdAndIsActiveFalse(roomId).asSequence()
            .filter { it.user.id != ownerId }
            .sortedByDescending { it.removedAt }
            .map(::memberDto)
            .toList()
    }

    @Transactional
    fun updateRoom(roomId: Int, ownerId: Int, request: CreateRoomRequest): RoomDto {
        val room = requireOwner(roomId, ownerId)
        room.roomName = request.roomName.trim()
        room.roomNumber = request.roomNumber?.trim()?.takeIf(String::isNotEmpty)
        room.monthlyRent = request.monthlyRent
        return toRoomDto(room)
    }

    @Transactional
    fun deleteRoom(roomId: Int, ownerId: Int): MessageResponse {
        val room = requireOwner(roomId, ownerId)
        rooms.delete(room)
        return MessageResponse("Room deleted successfully")
    }

    @Transactional
    fun leaveRoom(roomId: Int, userId: Int): MessageResponse {
        val room = findRoom(roomId)
        val membership = roomMembers.findByRoom_IdAndUser_Id(roomId, userId)
        if (membership == null || !membership.isActive) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "Room membership not found")
        }

        if (room.createdBy.id != userId) {
            membership.isActive = false
            membership.removedAt = LocalDateTime.now()
            return MessageResponse("You have left the room successfully.")
        }

        val nextOwnerMembership = activeResidents(room).firstOrNull { it.user.id != userId }
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Add another active Member before transferring ownership and leaving")
        membership.isActive = false
        membership.removedAt = LocalDateTime.now()
        membership.role = "MEMBER"
        nextOwnerMembership.role = "OWNER"
        room.createdBy = nextOwnerMembership.user
        return MessageResponse("You left the room and ownership was transferred to ${nextOwnerMembership.user.name}.")
    }

    @Transactional(readOnly = true)
    fun requireActiveMembership(roomId: Int, userId: Int): RoomMember {
        val membership = roomMembers.findByRoom_IdAndUser_Id(roomId, userId)
        if (membership == null || !membership.isActive) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You are not an active Member of this room")
        }
        return membership
    }

    @Transactional(readOnly = true)
    fun requireResident(roomId: Int, userId: Int): RoomMember = requireActiveMembership(roomId, userId)

    @Transactional(readOnly = true)
    fun activeResidents(roomId: Int): List<RoomMember> = activeResidents(findRoom(roomId))

    fun findRoom(roomId: Int): Room = rooms.findById(roomId).orElseThrow {
        ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found")
    }

    private fun findUser(userId: Int) = users.findById(userId).orElseThrow {
        ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")
    }

    private fun requireOwner(roomId: Int, userId: Int): Room {
        val room = findRoom(roomId)
        requireActiveMembership(roomId, userId)
        if (room.createdBy.id != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the room Owner can manage room settings and Members")
        }
        return room
    }

    private fun activeResidents(room: Room): List<RoomMember> =
        roomMembers.findByRoom_IdAndIsActiveTrue(room.id!!)

    private fun toRoomDto(room: Room): RoomDto = RoomDto(
        id = room.id!!,
        roomName = room.roomName,
        roomNumber = room.roomNumber,
        monthlyRent = room.monthlyRent,
        createdBy = room.createdBy.id!!,
        createdByName = room.createdBy.name,
        members = activeResidents(room)
            .filter { it.user.id != room.createdBy.id }
            .map(::memberDto),
    )

    private fun memberDto(membership: RoomMember) = MemberDto(
        id = membership.user.id!!,
        name = membership.user.name,
        email = membership.user.email,
        role = if (membership.user.id == membership.room.createdBy.id) "OWNER" else "MEMBER",
        active = membership.isActive,
        removedAt = membership.removedAt,
    )
}
