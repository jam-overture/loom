import { memoryAccountStore, memoryMembershipStore } from "./accounts-memory"
import {
  describeAccountStoreContract,
  describeMembershipStoreContract,
} from "./accounts.contract"

describeAccountStoreContract("memoryAccountStore", memoryAccountStore)

describeMembershipStoreContract("memoryMembershipStore", memoryMembershipStore)
