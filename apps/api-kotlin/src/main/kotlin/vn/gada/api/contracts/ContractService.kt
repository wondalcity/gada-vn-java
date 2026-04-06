package vn.gada.api.contracts

import org.springframework.stereotype.Service
import vn.gada.api.common.exception.ForbiddenException
import vn.gada.api.common.exception.NotFoundException
import vn.gada.api.notifications.NotificationService

@Service
class ContractService(
    private val repo: ContractRepository,
    private val notifications: NotificationService
) {

    fun generate(managerUserId: String, applicationId: String): Map<String, Any?>? {
        val application = repo.findAcceptedApplication(applicationId, managerUserId)
            ?: throw NotFoundException("Application not found or unauthorized")

        val contractHtml = """<html><body>
      <h1>근로계약서</h1>
      <p>일자리: ${application["job_title"]}</p>
      <p>근무일: ${application["work_date"]}</p>
      <p>일당: ${application["daily_wage"]} VND</p>
      <p>근로자: ${application["worker_name"]}</p>
    </body></html>"""

        val contract = repo.create(
            applicationId = applicationId,
            jobId = application["job_id"] as String,
            workerId = application["worker_profile_id"] as String,
            managerId = application["manager_profile_id"] as String,
            contractHtml = contractHtml
        ) ?: return null

        // Notify worker — fire-and-forget
        try {
            val contractId = contract["id"] as String
            val parties = repo.findPartyUserIds(contractId)
            parties["workerUserId"]?.let { workerUserId ->
                notifications.send(
                    userId = workerUserId,
                    type = "CONTRACT_READY",
                    title = "계약서가 발행되었습니다 📄",
                    body = "계약서를 확인하고 서명해 주세요.",
                    data = mapOf("contractId" to contractId)
                )
            }
        } catch (e: Exception) {
            // Ignore notification errors
        }

        return contract
    }

    fun findByWorker(workerUserId: String): List<Map<String, Any?>> {
        return repo.findByWorkerUserId(workerUserId)
    }

    fun findById(id: String, userId: String): Map<String, Any?> {
        val contract = repo.findById(id)
            ?: throw NotFoundException("Contract $id not found")

        val isParty = repo.isUserPartyToContract(id, userId)
        if (!isParty) throw ForbiddenException("Access denied")

        return contract
    }

    fun sign(id: String, workerUserId: String, signatureData: String?): Map<String, Any?>? {
        val contract = repo.findById(id)
            ?: throw NotFoundException("Contract $id not found")

        val isWorker = repo.isWorkerPartyToContract(id, workerUserId)
        if (!isWorker) throw ForbiddenException("Not authorized to sign this contract")

        val signed = repo.sign(id, workerUserId, signatureData ?: "")

        // Notify manager — fire-and-forget
        try {
            val parties = repo.findPartyUserIds(id)
            parties["managerUserId"]?.let { managerUserId ->
                notifications.send(
                    userId = managerUserId,
                    type = "CONTRACT_SIGNED",
                    title = "근로자가 계약서에 서명했습니다 ✅",
                    body = "계약이 완료되었습니다. 계약서를 확인해 주세요.",
                    data = mapOf("contractId" to id)
                )
            }
        } catch (e: Exception) {
            // Ignore notification errors
        }

        return signed
    }
}
