import { describeGoalStoreContract } from "./goals.contract"
import { memoryGoalStore } from "./goals-memory"

describeGoalStoreContract("memoryGoalStore", memoryGoalStore)
