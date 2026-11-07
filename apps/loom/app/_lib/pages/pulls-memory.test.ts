import { describeSitePullStoreContract } from "./pulls.contract"
import { memorySitePullStore } from "./pulls-memory"

describeSitePullStoreContract("memorySitePullStore", memorySitePullStore)
