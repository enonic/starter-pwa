import LogModel from "../model/LogModel";
import TekstModel from "../model/TekstModel";


export default class Sync {
    static syncOfflineMemos() {
        /*
        LogModel.getAll('time', LogModel.DESCENDING).then((logs) => {
            let syncMemos = [];
            let asyncUpdates = [];

            logs.forEach((log) => {

                if (syncMemos.indexOf(log.memoKey) >= 0) {
                    return;
                }

                if (log.type == LogModel.OPERATION_TYPES.CREATED || log.type == LogModel.OPERATION_TYPES.UPDATED) {
                    syncMemos.push(log.memoKey);

                    asyncUpdates.push(
                        TekstModel.get(log.memoKey).then((localMemo) => {
                            if (localMemo) {
                                return TekstModel.put(localMemo).then(() => {
                                    return TekstModel.delete(log.memoKey, TekstModel.getIndexedDBInstance());
                                })
                            }
                        })
                    );
                } else if (log.type == LogModel.OPERATION_TYPES.DELETED) {
                    syncMemos.push(log.memoKey);

                    asyncUpdates.push(
                        TekstModel.delete(log.memoKey)
                    );
                }
            });

            LogModel.deleteAll();
            asyncUpdates.push(TekstModel.deleteAll(TekstModel.getIndexedDBInstance()));  
        });
        */
        console.log("Sync function not implemented..")

    }
}