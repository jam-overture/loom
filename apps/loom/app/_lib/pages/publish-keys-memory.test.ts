import { memoryPublishKeyStore } from "./publish-keys-memory"
import { describePublishKeyStoreContract } from "./publish-keys.contract"

describePublishKeyStoreContract("memoryPublishKeyStore", memoryPublishKeyStore)
