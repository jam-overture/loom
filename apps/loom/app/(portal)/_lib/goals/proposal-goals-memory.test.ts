import { describeProposalGoalStoreContract } from "./proposal-goals.contract"
import { memoryProposalGoalStore } from "./proposal-goals-memory"

describeProposalGoalStoreContract("memoryProposalGoalStore", memoryProposalGoalStore)
