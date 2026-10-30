package com.roommate.service

import com.roommate.dto.ExpenseDto
import com.roommate.dto.ExpenseRequest
import com.roommate.dto.ExpenseShareDto
import com.roommate.model.Expense
import com.roommate.model.ExpenseSplit
import com.roommate.repository.ExpenseRepository
import com.roommate.repository.ExpenseSplitRepository
import com.roommate.repository.RoomMemberRepository
import com.roommate.repository.UserRepository
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.LocalDate
import java.time.YearMonth

@Service
class ExpenseService(
    private val expenses: ExpenseRepository,
    private val splits: ExpenseSplitRepository,
    private val roomMembers: RoomMemberRepository,
    private val users: UserRepository,
    private val roomService: RoomService,
) {
    @Transactional(readOnly = true)
    fun listAll(): List<ExpenseDto> = expenses.findAll().sortedByDescending { it.createdAt }.map(::toDto)

    @Transactional(readOnly = true)
    fun getById(expenseId: Int): ExpenseDto = toDto(findExpense(expenseId))

    @Transactional
    fun createRecord(request: ExpenseRequest): ExpenseDto {
        val roomId = request.roomId
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "room_id is required")
        val room = roomService.findRoom(roomId)
        requireEqualSplit(request.splitType)
        validatePayer(roomId, request.paidBy)
        val expense = expenses.saveAndFlush(Expense().apply {
            this.room = room
            title = request.title.trim()
            amount = request.amount
            category = request.category.trim()
            paidBy = request.paidBy.trim()
            splitType = "equal"
            expenseDate = request.date ?: LocalDate.now()
            description = request.description?.trim()?.takeIf(String::isNotEmpty)
        })
        replaceSplits(expense)
        return toDto(expense)
    }

    @Transactional
    fun updateRecord(expenseId: Int, request: ExpenseRequest): ExpenseDto {
        val expense = findExpense(expenseId)
        if (expense.splitType == "room_monthly_rent") {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Room rent is managed in room settings")
        }
        requireEqualSplit(request.splitType)
        validatePayer(expense.room.id!!, request.paidBy)
        expense.title = request.title.trim()
        expense.amount = request.amount
        expense.category = request.category.trim()
        expense.paidBy = request.paidBy.trim()
        expense.expenseDate = request.date ?: expense.expenseDate
        expense.description = request.description?.trim()?.takeIf(String::isNotEmpty)
        replaceSplits(expense)
        return toDto(expense)
    }

    @Transactional
    fun deleteRecord(expenseId: Int) {
        val expense = findExpense(expenseId)
        if (expense.splitType == "room_monthly_rent") {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Room rent is managed in room settings")
        }
        splits.deleteByExpense_Id(expenseId)
        expenses.delete(expense)
    }

    @Transactional(readOnly = true)
    fun list(userId: Int): List<ExpenseDto> {
        val roomId = currentRoomId(userId) ?: return emptyList()
        return expenses.findByRoom_IdOrderByCreatedAtDesc(roomId).map(::toDto)
    }

    @Transactional(readOnly = true)
    fun get(expenseId: Int, userId: Int): ExpenseDto {
        val expense = findExpense(expenseId)
        roomService.requireActiveMembership(expense.room.id!!, userId)
        return toDto(expense)
    }

    @Transactional
    fun create(userId: Int, request: ExpenseRequest): ExpenseDto {
        val roomId = request.roomId ?: currentRoomId(userId)
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Create or join a room before adding expenses")
        requireMember(userId, roomId)
        val room = roomService.findRoom(roomId)
        requireEqualSplit(request.splitType)
        validatePayer(roomId, request.paidBy)

        val expense = expenses.saveAndFlush(Expense().apply {
            this.room = room
            title = request.title.trim()
            amount = request.amount
            category = request.category.trim()
            paidBy = request.paidBy.trim()
            splitType = "equal"
            expenseDate = request.date ?: LocalDate.now()
            description = request.description?.trim()?.takeIf(String::isNotEmpty)
        })
        replaceSplits(expense)
        return toDto(expense)
    }

    @Transactional
    fun update(expenseId: Int, userId: Int, request: ExpenseRequest): ExpenseDto {
        val expense = findExpense(expenseId)
        requireMember(userId, expense.room.id!!)
        if (expense.splitType == "room_monthly_rent") {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Room rent is managed in room settings")
        }
        requireEqualSplit(request.splitType)
        validatePayer(expense.room.id!!, request.paidBy)
        expense.title = request.title.trim()
        expense.amount = request.amount
        expense.category = request.category.trim()
        expense.paidBy = request.paidBy.trim()
        expense.expenseDate = request.date ?: expense.expenseDate
        expense.description = request.description?.trim()?.takeIf(String::isNotEmpty)
        replaceSplits(expense)
        return toDto(expense)
    }

    @Transactional
    fun delete(expenseId: Int, userId: Int) {
        val expense = findExpense(expenseId)
        requireMember(userId, expense.room.id!!)
        if (expense.splitType == "room_monthly_rent") {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Room rent is managed in room settings")
        }
        splits.deleteByExpense_Id(expenseId)
        expenses.delete(expense)
    }

    @Transactional(readOnly = true)
    fun summary(userId: Int): Map<String, Any> {
        val roomId = currentRoomId(userId) ?: return mapOf(
            "totalExpenses" to BigDecimal.ZERO,
            "yourShare" to BigDecimal.ZERO,
            "amountPaidByYou" to BigDecimal.ZERO,
            "pendingSettlement" to BigDecimal.ZERO,
        )
        val user = users.findById(userId).orElseThrow()
        val records = sharedExpenses(roomId)
        val userShare = records.flatMap(::sharesFor)
            .filter { it.name.equals(user.name, ignoreCase = true) }
            .fold(BigDecimal.ZERO) { total, share -> total + share.amount }
        val paid = records.filter { it.paidBy.equals(user.name, ignoreCase = true) }
            .fold(BigDecimal.ZERO) { total, expense -> total + expense.amount }
        return mapOf(
            "totalExpenses" to records.fold(BigDecimal.ZERO) { total, expense -> total + expense.amount },
            "yourShare" to userShare,
            "amountPaidByYou" to paid,
            "pendingSettlement" to (userShare - paid).max(BigDecimal.ZERO),
            "rentDue" to roomService.findRoom(roomId).monthlyRent.divide(
                BigDecimal(activeMemberCount(roomId).coerceAtLeast(1)), 2, RoundingMode.HALF_UP,
            ),
            "ownerContribution" to BigDecimal.ZERO,
        )
    }

    @Transactional(readOnly = true)
    fun monthly(userId: Int): List<Map<String, Any>> = currentRoomId(userId)?.let { roomId ->
        sharedExpenses(roomId).groupBy { YearMonth.from(it.expenseDate ?: LocalDate.now()).toString() }
            .toSortedMap()
            .map { (month, rows) -> mapOf("month" to month, "amount" to rows.fold(BigDecimal.ZERO) { sum, row -> sum + row.amount }) }
    } ?: emptyList()

    @Transactional(readOnly = true)
    fun categoryBreakdown(userId: Int): List<Map<String, Any>> = currentRoomId(userId)?.let { roomId ->
        sharedExpenses(roomId).groupBy { it.category }
            .toSortedMap()
            .map { (category, rows) -> mapOf("category" to category, "amount" to rows.fold(BigDecimal.ZERO) { sum, row -> sum + row.amount }) }
    } ?: emptyList()

    @Transactional(readOnly = true)
    fun contributions(userId: Int): List<Map<String, Any>> = currentRoomId(userId)?.let { roomId ->
        val room = roomService.findRoom(roomId)
        val records = sharedExpenses(roomId)
        roomService.activeResidents(roomId).map { membership ->
            val name = membership.user.name
            val paid = records.filter { it.paidBy.equals(name, ignoreCase = true) }
                .fold(BigDecimal.ZERO) { sum, expense -> sum + expense.amount }
            val share = records.flatMap(::sharesFor)
                .filter { it.name.equals(name, ignoreCase = true) }
                .fold(BigDecimal.ZERO) { sum, item -> sum + item.amount }
            mapOf("userId" to membership.user.id!!, "name" to name, "amountPaid" to paid, "share" to share, "balance" to paid - share)
        }.filter { it["userId"] != room.createdBy.id }
    } ?: emptyList()

    @Transactional(readOnly = true)
    fun settlements(userId: Int): List<Map<String, Any>> {
        val balances = contributions(userId).map { row ->
            row["name"].toString() to (row["balance"] as BigDecimal)
        }
        val debtors = balances.filter { it.second < BigDecimal.ZERO }.map { it.first to it.second.abs() }.toMutableList()
        val creditors = balances.filter { it.second > BigDecimal.ZERO }.toMutableList()
        val settlements = mutableListOf<Map<String, Any>>()
        var debtorIndex = 0
        var creditorIndex = 0
        while (debtorIndex < debtors.size && creditorIndex < creditors.size) {
            val amount = debtors[debtorIndex].second.min(creditors[creditorIndex].second)
            settlements.add(mapOf("from" to debtors[debtorIndex].first, "to" to creditors[creditorIndex].first, "amount" to amount))
            debtors[debtorIndex] = debtors[debtorIndex].first to (debtors[debtorIndex].second - amount)
            creditors[creditorIndex] = creditors[creditorIndex].first to (creditors[creditorIndex].second - amount)
            if (debtors[debtorIndex].second.compareTo(BigDecimal.ZERO) == 0) debtorIndex++
            if (creditors[creditorIndex].second.compareTo(BigDecimal.ZERO) == 0) creditorIndex++
        }
        return settlements
    }

    private fun currentRoomId(userId: Int): Int? = roomMembers.findByUser_IdAndIsActiveTrue(userId)
        .firstOrNull()?.room?.id

    private fun sharedExpenses(roomId: Int) = expenses.findByRoom_IdOrderByCreatedAtDesc(roomId)
        .filterNot { it.splitType == "room_monthly_rent" }

    private fun validatePayer(roomId: Int, paidBy: String) {
        val valid = roomService.activeResidents(roomId)
            .filter { it.user.id != roomService.findRoom(roomId).createdBy.id }
            .any { it.user.name.equals(paidBy.trim(), ignoreCase = true) }
        if (!valid) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an active Member as the expense payer")
    }

    private fun requireMember(userId: Int, roomId: Int) {
        val membership = roomService.requireActiveMembership(roomId, userId)
        if (membership.user.id == roomService.findRoom(roomId).createdBy.id) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "The room Owner cannot manage shared expenses")
        }
    }

    private fun requireEqualSplit(splitType: String) {
        if (!splitType.equals("equal", ignoreCase = true)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only equal expense splitting is supported")
        }
    }

    private fun replaceSplits(expense: Expense) {
        val expenseId = expense.id ?: return
        splits.deleteByExpense_Id(expenseId)
        val members = activeMembers(expense.room.id!!)
        if (members.isEmpty()) return
        val count = BigDecimal(members.size)
        val each = expense.amount.divide(count, 2, RoundingMode.DOWN)
        var assigned = BigDecimal.ZERO
        val rows = members.mapIndexed { index, member ->
            val share = if (index == members.lastIndex) expense.amount - assigned else each
            assigned += share
            ExpenseSplit().apply {
                this.expense = expense
                user = member.user
                amount = share
            }
        }
        splits.saveAll(rows)
    }

    private fun sharesFor(expense: Expense): List<ExpenseShareDto> {
        val saved = splits.findByExpense_Id(expense.id!!)
        if (saved.isNotEmpty()) {
            return saved.filter { activeMemberIds(expense.room.id!!).contains(it.user.id) }
                .map { ExpenseShareDto(it.user.name, it.amount) }
        }
        val members = activeMembers(expense.room.id!!)
        if (members.isEmpty()) return emptyList()
        val each = expense.amount.divide(BigDecimal(members.size), 2, RoundingMode.DOWN)
        var assigned = BigDecimal.ZERO
        return members.mapIndexed { index, member ->
            val amount = if (index == members.lastIndex) expense.amount - assigned else each
            assigned += amount
            ExpenseShareDto(member.user.name, amount)
        }
    }

    private fun activeMembers(roomId: Int) = roomService.activeResidents(roomId)
        .filter { it.user.id != roomService.findRoom(roomId).createdBy.id }

    private fun activeMemberCount(roomId: Int) = activeMembers(roomId).size

    private fun activeMemberIds(roomId: Int) = activeMembers(roomId).map { it.user.id }

    private fun toDto(expense: Expense): ExpenseDto = ExpenseDto(
        id = expense.id!!,
        roomId = expense.room.id!!,
        title = expense.title,
        amount = expense.amount,
        category = expense.category,
        paidBy = expense.paidBy,
        splitType = expense.splitType,
        expenseDate = expense.expenseDate,
        description = expense.description,
        createdAt = expense.createdAt,
        splitBetween = sharesFor(expense),
    )

    private fun findExpense(id: Int): Expense = expenses.findById(id).orElseThrow {
        ResponseStatusException(HttpStatus.NOT_FOUND, "Expense not found")
    }
}
