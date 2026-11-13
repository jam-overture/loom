import { describeSegmentChangeStoreContract } from "./segment-changes.contract"
import { memorySegmentChangeStore } from "./segment-changes-memory"

describeSegmentChangeStoreContract("memorySegmentChangeStore", memorySegmentChangeStore)
